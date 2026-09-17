import { Server } from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { sequelize } from './models';

let server: Server;

async function main(): Promise<void> {
  await sequelize.authenticate();
  logger.info('Database connection established');

  // Schema is managed exclusively via sequelize-cli migrations
  // (`npm run db:migrate`) - never call sequelize.sync() in application
  // code, to keep migrations as the single source of truth for the schema.

  const app = createApp();
  server = app.listen(env.PORT, () => {
    logger.info(`Server listening on port ${env.PORT} (${env.NODE_ENV})`);
  });
}

function shutdown(signal: string) {
  return async () => {
    logger.info(`${signal} received, shutting down gracefully...`);
    try {
      if (server) {
        await new Promise<void>((resolve, reject) => {
          server.close((err) => (err ? reject(err) : resolve()));
        });
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
  logger.error('Failed to start the application', { error: err });
  process.exit(1);
});
