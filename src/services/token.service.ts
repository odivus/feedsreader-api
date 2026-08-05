import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload } from '../config/passport';
import { RefreshToken } from '../models/RefreshToken';
import { User } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { generateRawToken, hashToken } from '../utils/crypto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
}

export const generateAccessToken = (user: User): string => {
  const payload: JwtPayload = { sub: user.id, username: user.username };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as SignOptions);
};

/**
 * Creates a new refresh token for the user, storing only its hash in the
 * database. The raw (unhashed) value is returned once and must be sent to
 * the client (as an httpOnly cookie) - it cannot be recovered afterwards.
 */
export const generateRefreshToken = async (
  user: User,
  meta: RequestMeta = {},
): Promise<{ raw: string; expiresAt: Date }> => {
  const raw = generateRawToken();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    userId: user.id,
    tokenHash: hashToken(raw),
    expiresAt,
    userAgent: meta.userAgent ?? null,
    ipAddress: meta.ipAddress ?? null,
  });

  return { raw, expiresAt };
};

export const issueTokenPair = async (user: User, meta: RequestMeta = {}): Promise<TokenPair> => {
  const accessToken = generateAccessToken(user);
  const { raw, expiresAt } = await generateRefreshToken(user, meta);
  return { accessToken, refreshToken: raw, refreshTokenExpiresAt: expiresAt };
};

/**
 * Validates a raw refresh token against the database, ensuring it exists,
 * is not revoked, and has not expired. Returns the associated user and the
 * DB record (so the caller can revoke/rotate it).
 */
export const verifyRefreshToken = async (rawToken: string): Promise<{ user: User; tokenRecord: RefreshToken }> => {
  const tokenHash = hashToken(rawToken);
  const tokenRecord = await RefreshToken.findOne({ where: { tokenHash } });

  if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt < new Date()) {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await User.findByPk(tokenRecord.userId);
  if (!user) {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  return { user, tokenRecord };
};

/** Revokes a single refresh token (used on rotation and logout). */
export const revokeRefreshToken = async (tokenRecord: RefreshToken): Promise<void> => {
  tokenRecord.revokedAt = new Date();
  await tokenRecord.save();
};

/** Revokes every refresh token belonging to a user (e.g. "logout everywhere"). */
export const revokeAllUserRefreshTokens = async (userId: number): Promise<void> => {
  await RefreshToken.update({ revokedAt: new Date() }, { where: { userId, revokedAt: null } });
};

/**
 * Rotates a refresh token: revokes the old one and issues a brand new
 * pair. Rotation limits the damage a stolen refresh token can do, since it
 * becomes single-use.
 */
export const rotateRefreshToken = async (rawOldToken: string, meta: RequestMeta = {}): Promise<TokenPair> => {
  const { user, tokenRecord } = await verifyRefreshToken(rawOldToken);
  await revokeRefreshToken(tokenRecord);
  return issueTokenPair(user, meta);
};
