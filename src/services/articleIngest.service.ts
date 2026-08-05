import { Article } from '../models/Article';
import { ParsedArticle } from './feedParser.service';

/**
 * Inserts newly-parsed articles for a feed. Relies on the
 * (feed_id, guid_hash) unique index + `ignoreDuplicates` (INSERT IGNORE) to
 * silently skip articles already seen on a previous run, rather than
 * fetching existing guids first and diffing in application code.
 *
 * Returns how many rows were actually new (best-effort - see note below).
 */
export const ingestArticles = async (feedId: number, items: ParsedArticle[]): Promise<number> => {
  if (items.length === 0) return 0;

  const rows = items.map((item) => ({ feedId, ...item }));

  // Sequelize/MySQL doesn't reliably report which specific rows were
  // skipped by INSERT IGNORE, so `created` here is an upper bound (the
  // number of rows submitted), not a guaranteed exact "new articles"
  // count. Good enough for logging; do a COUNT query first instead if you
  // need an exact figure.
  await Article.bulkCreate(rows, { ignoreDuplicates: true });
  return rows.length;
};
