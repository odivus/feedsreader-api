import { NextFunction, Request, Response } from 'express';
import { passport } from '../config/passport';
import { User } from '../models/User';
import { ApiError } from '../utils/ApiError';

/**
 * Protects a route: requires a valid `Authorization: Bearer <accessToken>`
 * header. Never uses sessions - fully stateless per request.
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('jwt', { session: false }, (err: Error | null, user: User | false) => {
    if (err) return next(err);
    if (!user) return next(ApiError.unauthorized('Missing or invalid access token'));
    req.user = user;
    next();
  })(req, res, next);
};
