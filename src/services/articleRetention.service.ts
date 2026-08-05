import { QueryTypes } from 'sequelize';
import { env } from '../config/env';
import { sequelize } from '../config/database';

export interface PruneResult {
  prunedByAge: number;
  prunedByCount: number;
}

/**
 * Soft cap: deletes articles older than ARTICLES_MAX_AGE_DAYS for this feed.
 * Articles with published_at = null are intentionally left alone here - we
 * have no way to judge their age, so they fall through to the count-based
 * cap below instead.
 */
const pruneByAge = async (feedId: number): Promise<number> => {
  const affectedRows = await sequelize.query(
    `DELETE FROM articles
     WHERE feed_id = :feedId
       AND published_at IS NOT NULL
       AND published_at < DATE_SUB(NOW(), INTERVAL :maxAgeDays DAY)`,
    { replacements: { feedId, maxAgeDays: env.ARTICLES_MAX_AGE_DAYS }, type: QueryTypes.BULKDELETE },
  );
  return affectedRows ?? 0;
};

/**
 * Hard cap: keeps only the ARTICLES_MAX_PER_FEED most recent articles for
 * this feed, deleting the rest. "Most recent" = published_at DESC, with
 * articles that have no published_at treated as oldest (pruned first when
 * over budget) and `id DESC` as the final tiebreaker for articles published
 * at the exact same time.
 *
 * Implemented as a "keep the top N, delete everything else" MySQL pattern:
 * the inner SELECT is materialized as a derived table before the DELETE
 * runs, which is what lets it reference `articles` (the table being
 * deleted from) without MySQL error 1093 ("can't specify target table for
 * update in FROM clause").
 */
const pruneByCount = async (feedId: number): Promise<number> => {
  const affectedRows = await sequelize.query(
    `DELETE a FROM articles a
     LEFT JOIN (
       SELECT id FROM articles
       WHERE feed_id = :feedId
       ORDER BY published_at IS NULL, published_at DESC, id DESC
       LIMIT :maxPerFeed
     ) keep ON a.id = keep.id
     WHERE a.feed_id = :feedId AND keep.id IS NULL`,
    { replacements: { feedId, maxPerFeed: env.ARTICLES_MAX_PER_FEED }, type: QueryTypes.BULKDELETE },
  );
  return affectedRows ?? 0;
};

/**
 * Applies the retention policy for a single feed, right after ingesting its
 * newly-parsed articles (see feedRefresh.service.ts). Runs the soft
 * age-based prune first, then the hard count-based cap - so the count query
 * has less to scan through by the time it runs.
 */
export const pruneArticlesForFeed = async (feedId: number): Promise<PruneResult> => {
  const prunedByAge = await pruneByAge(feedId);
  const prunedByCount = await pruneByCount(feedId);
  return { prunedByAge, prunedByCount };
};
