import { NextFunction, Request, Response } from 'express';
import { passport } from '../config/passport';
import { env } from '../config/env';
import { User } from '../models/User';
import { registerUser } from '../services/auth.service';
import { issueTokenPair, revokeRefreshToken, rotateRefreshToken, verifyRefreshToken } from '../services/token.service';
import { ApiError } from '../utils/ApiError';
import { catchAsync } from '../utils/catchAsync';
import {
  clearRefreshTokenCookie,
  getRefreshTokenFromRequest,
  getRequestMeta,
  setRefreshTokenCookie,
} from '../utils/cookies';
import { RegisterDto } from '../validators/auth.validator';

export const register = catchAsync(async (req: Request, res: Response) => {
  const dto = req.body as RegisterDto;
  const user = await registerUser(dto);

  const { accessToken, refreshToken, refreshTokenExpiresAt } = await issueTokenPair(user, getRequestMeta(req));
  setRefreshTokenCookie(res, refreshToken, refreshTokenExpiresAt);

  res.status(201).json({ user: user.toPublicJSON(), accessToken });
});

export const login = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate(
    'local',
    { session: false },
    async (err: Error | null, user: User | false, info?: { message?: string }) => {
      try {
        if (err) return next(err);
        if (!user) return next(ApiError.unauthorized(info?.message ?? 'Invalid credentials'));

        const { accessToken, refreshToken, refreshTokenExpiresAt } = await issueTokenPair(user, getRequestMeta(req));
        setRefreshTokenCookie(res, refreshToken, refreshTokenExpiresAt);

        res.status(200).json({ user: user.toPublicJSON(), accessToken });
      } catch (error) {
        next(error);
      }
    },
  )(req, res, next);
};

// The `login` handler above intentionally avoids `catchAsync` because
// `passport.authenticate` needs the raw (req, res, next) signature; errors
// inside the async callback are still forwarded to `next` manually.

export const refresh = catchAsync(async (req: Request, res: Response) => {
  const rawToken = getRefreshTokenFromRequest(req);
  if (!rawToken) {
    throw ApiError.unauthorized('No refresh token provided');
  }

  const { accessToken, refreshToken, refreshTokenExpiresAt } = await rotateRefreshToken(rawToken, getRequestMeta(req));
  setRefreshTokenCookie(res, refreshToken, refreshTokenExpiresAt);

  res.status(200).json({ accessToken });
});

export const logout = catchAsync(async (req: Request, res: Response) => {
  const rawToken = getRefreshTokenFromRequest(req);

  if (rawToken) {
    try {
      const { tokenRecord } = await verifyRefreshToken(rawToken);
      await revokeRefreshToken(tokenRecord);
    } catch {
      // Token was already invalid/expired - nothing to revoke, proceed to clear the cookie anyway.
    }
  }

  clearRefreshTokenCookie(res);
  res.status(204).send();
});

export const me = catchAsync(async (req: Request, res: Response) => {
  res.status(200).json({ user: (req.user as User).toPublicJSON() });
});

/**
 * Completes an OAuth login (Google/GitHub): issues a token pair and
 * redirects back to the SPA. The access token travels as a short-lived
 * query param (the SPA should read and discard it from the URL
 * immediately); the refresh token is set as an httpOnly cookie.
 */
export const oauthCallback = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as User;
  const { accessToken, refreshToken, refreshTokenExpiresAt } = await issueTokenPair(user, getRequestMeta(req));
  setRefreshTokenCookie(res, refreshToken, refreshTokenExpiresAt);

  const redirectUrl = new URL('/oauth/callback', env.CLIENT_URL);
  redirectUrl.searchParams.set('accessToken', accessToken);
  res.redirect(redirectUrl.toString());
});
