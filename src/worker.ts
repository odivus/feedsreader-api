import cron, { ScheduledTask } from 'node-cron';
import { env } from './config/env';
import { logger } from './config/logger';
import { sequelize } from './models';
import { refreshAllFeeds } from './services/feedRefresh.service';

let task: ScheduledTask | undefined;

const runRefreshCycle = async (): Promise<void> => {
  logger.info('Feed refresh cycle starting');
  try {
    const summary = await refreshAllFeeds();
    logger.info('Feed refresh cycle finished', { ...summary });
  } catch (error) {
    // refreshAllFeeds already isolates per-feed failures - reaching here
    // means something broader broke (e.g. DB connection dropped mid-run).
    logger.error('Feed refresh cycle failed unexpectedly', { error });
  }
};

async function main(): Promise<void> {
  await sequelize.authenticate();
  logger.info('Database connection established');

  if (!cron.validate(env.FEED_PARSE_CRON_SCHEDULE)) {
    throw new Error(`Invalid FEED_PARSE_CRON_SCHEDULE: "${env.FEED_PARSE_CRON_SCHEDULE}"`);
  }

  logger.info(`Feed worker started - schedule: "${env.FEED_PARSE_CRON_SCHEDULE}"`);

  task = cron.schedule(env.FEED_PARSE_CRON_SCHEDULE, runRefreshCycle, {
    // If a cycle is still running when the next tick fires (e.g. many
    // slow/timing-out feeds), skip that tick instead of running two
    // refresh passes concurrently against the same feeds.
    noOverlap: true,
  });

  // Run once immediately on startup, rather than waiting for the first
  // cron tick - useful right after a fresh deploy/restart.
  await runRefreshCycle();
}

function shutdown(signal: string) {
  return async () => {
    logger.info(`${signal} received, shutting down gracefully...`);
    try {
      if (task) {
        await task.stop();
      }
      await sequelize.close();
      logger.info('Shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown', { error: err });
      process.exit(1);
    }
  };
}

process.on('SIGINT', shutdown('SIGINT'));
process.on('SIGTERM', shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason });
});

main().catch((err) => {
  logger.error('Failed to start the feed worker', { error: err });
  process.exit(1);
});
