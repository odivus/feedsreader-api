import { NextFunction, Request, Response } from 'express';
import { ValidationError as SequelizeValidationError, UniqueConstraintError } from 'sequelize';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';

/**
 * Single place where every error in the app ends up. Converts known error
 * types (Sequelize, ApiError) into a consistent JSON shape and makes sure
 * unexpected ("non-operational") errors never leak internal details to
 * the client, while still being logged in full server-side.
 */
export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  let apiError: ApiError;

  if (err instanceof ApiError) {
    apiError = err;
  } else if (err instanceof UniqueConstraintError) {
    apiError = ApiError.conflict(
      'A record with this value already exists',
      err.errors?.map((e) => e.message),
    );
  } else if (err instanceof SequelizeValidationError) {
    apiError = ApiError.badRequest(
      'Validation failed',
      err.errors.map((e) => e.message),
    );
  } else if (err instanceof Error && err.name === 'JsonWebTokenError') {
    apiError = ApiError.unauthorized('Invalid access token');
  } else if (err instanceof Error && err.name === 'TokenExpiredError') {
    apiError = ApiError.unauthorized('Access token expired');
  } else {
    apiError = ApiError.internal();
  }

  if (!apiError.isOperational) {
    logger.error('Unexpected error', { error: err, path: req.path, method: req.method });
  } else if (apiError.statusCode >= 500) {
    logger.error(apiError.message, { path: req.path, method: req.method });
  } else {
    logger.debug(apiError.message, { path: req.path, method: req.method });
  }

  res.status(apiError.statusCode).json({
    message: apiError.isOperational ? apiError.message : 'Internal server error',
    ...(apiError.details ? { details: apiError.details } : {}),
    ...(env.isDevelopment && err instanceof Error && !apiError.isOperational ? { stack: err.stack } : {}),
  });
};
