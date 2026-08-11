export interface FeedCursor {
  publishedAt: string; // ISO string
  id: number;
}

/** Opaque, URL-safe cursor - just base64(JSON), not meant to be human-edited. */
export const encodeCursor = (cursor: FeedCursor): string =>
  Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');

/** Returns null for a missing/malformed cursor - callers decide how to handle that. */
export const decodeCursor = (raw: string): FeedCursor | null => {
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.publishedAt === 'string' &&
      typeof parsed.id === 'number' &&
      Number.isInteger(parsed.id)
    ) {
      return { publishedAt: parsed.publishedAt, id: parsed.id };
    }
    return null;
  } catch {
    return null;
  }
};
