import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';

/**
 * Validates `req.body` / `req.query` / `req.params` against a Zod schema
 * shaped like `{ body?, query?, params? }`. On success, the parsed
 * (and coerced/trimmed) values are written back onto `req` so downstream
 * handlers work with clean, typed data.
 */
export const validate = (schema: AnyZodObject) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (parsed.body) req.body = parsed.body;
      if (parsed.params) req.params = parsed.params;
      if (parsed.query) req.query = parsed.query;

      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(ApiError.badRequest('Validation failed', err.flatten().fieldErrors));
      }
      next(err);
    }
  };
};
