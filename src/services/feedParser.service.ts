import Parser from 'rss-parser';
import { env } from '../config/env';
import { sha256Hex } from '../utils/crypto';

export interface ParsedArticle {
  guidHash: string;
  guid: string;
  title: string | null;
  link: string | null;
  description: string | null;
  publishedAt: Date | null;
}

const parser = new Parser({ timeout: env.FEED_FETCH_TIMEOUT_MS });

/** Truncates text defensively to fit the DB column, in case a feed sends something huge. */
const truncate = (value: string | undefined | null, maxLength: number): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1)}…` : trimmed;
};

const parsePublishedAt = (item: Parser.Item): Date | null => {
  const raw = item.isoDate ?? item.pubDate;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Normalizes a single feed item into what we store. Per-item guid falls back
 * to the link when the feed doesn't provide one (some feeds omit <guid>
 * entirely) - if neither is present the item is unusable and skipped by the
 * caller.
 */
const normalizeItem = (item: Parser.Item): ParsedArticle | null => {
  const rawGuid = item.guid ?? item.link;
  if (!rawGuid) return null;

  return {
    guidHash: sha256Hex(rawGuid),
    guid: rawGuid,
    title: truncate(item.title, 512),
    link: truncate(item.link, 1024),
    // contentSnippet is rss-parser's pre-stripped-of-HTML summary - a
    // better fit for "brief description" than raw `content`/`summary`,
    // which can contain full HTML markup.
    description: truncate(item.contentSnippet ?? item.summary, 5000),
    publishedAt: parsePublishedAt(item),
  };
};

/**
 * Fetches and parses a feed URL. Throws on network/parse failure - callers
 * are responsible for catching per-feed errors so one bad feed doesn't
 * abort a whole batch.
 */
export const parseFeed = async (feedUrl: string): Promise<ParsedArticle[]> => {
  const { items } = await parser.parseURL(feedUrl);
  return items.map(normalizeItem).filter((item): item is ParsedArticle => item !== null);
};
