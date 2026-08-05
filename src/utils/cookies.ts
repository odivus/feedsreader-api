import { Request, Response } from 'express';
import { env } from '../config/env';

const REFRESH_COOKIE_PATH = '/api/auth';

export const setRefreshTokenCookie = (res: Response, token: string, expiresAt: Date): void => {
  res.cookie(env.REFRESH_TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
    expires: expiresAt,
  });
};

export const clearRefreshTokenCookie = (res: Response): void => {
  res.clearCookie(env.REFRESH_TOKEN_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
};

export const getRefreshTokenFromRequest = (req: Request): string | undefined => {
  return req.cookies?.[env.REFRESH_TOKEN_COOKIE_NAME];
};

export const getRequestMeta = (req: Request) => ({
  userAgent: req.get('user-agent') ?? undefined,
  ipAddress: req.ip,
});
