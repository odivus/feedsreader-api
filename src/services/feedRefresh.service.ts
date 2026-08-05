import pLimit from 'p-limit';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { Feed, FeedFetchStatus } from '../models/Feed';
import { ingestArticles } from './articleIngest.service';
import { pruneArticlesForFeed } from './articleRetention.service';
import { parseFeed } from './feedParser.service';

export interface RefreshSummary {
  totalFeeds: number;
  succeeded: number;
  failed: number;
  durationMs: number;
}

const MAX_ERROR_LENGTH = 1024;

const refreshOneFeed = async (feed: Feed): Promise<boolean> => {
  try {
    const items = await parseFeed(feed.url);
    const inserted = await ingestArticles(feed.id, items);
    const pruned = await pruneArticlesForFeed(feed.id);

    feed.lastFetchedAt = new Date();
    feed.lastFetchStatus = FeedFetchStatus.SUCCESS;
    feed.lastFetchError = null;
    await feed.save();

    logger.debug(`Feed #${feed.id} refreshed`, {
      feedId: feed.id,
      itemsParsed: items.length,
      inserted,
      ...pruned,
    });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    feed.lastFetchedAt = new Date();
    feed.lastFetchStatus = FeedFetchStatus.ERROR;
    feed.lastFetchError = message.slice(0, MAX_ERROR_LENGTH);
    await feed.save();

    logger.warn(`Feed #${feed.id} failed to refresh: ${message}`, { feedId: feed.id, url: feed.url });
    return false;
  }
};

/**
 * Refreshes every feed in the system once: fetches, parses, and ingests new
 * articles, with bounded concurrency (FEED_FETCH_CONCURRENCY) so we don't
 * open dozens of simultaneous outbound connections. A single feed failing
 * (dead URL, malformed XML, timeout) never aborts the batch - it's recorded
 * on that feed via last_fetch_status/last_fetch_error and the run continues.
 */
export const refreshAllFeeds = async (): Promise<RefreshSummary> => {
  const startedAt = Date.now();
  const feeds = await Feed.findAll();
  const limit = pLimit(env.FEED_FETCH_CONCURRENCY);

  const results = await Promise.all(feeds.map((feed) => limit(() => refreshOneFeed(feed))));

  const succeeded = results.filter(Boolean).length;
  return {
    totalFeeds: feeds.length,
    succeeded,
    failed: feeds.length - succeeded,
    durationMs: Date.now() - startedAt,
  };
};
