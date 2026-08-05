import crypto from 'crypto';

/** Generates a cryptographically strong random opaque token (raw, sent to the client). */
export const generateRawToken = (): string => crypto.randomBytes(64).toString('hex');

/** One-way hash of a raw token, safe to store in the database (never store raw tokens). */
export const hashToken = (rawToken: string): string => sha256Hex(rawToken);

/** SHA-256 hex digest of an arbitrary string (e.g. an RSS item guid/link, for dedup indexing). */
export const sha256Hex = (value: string): string => crypto.createHash('sha256').update(value).digest('hex');
