import { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Wraps an async Express handler so any rejected promise / thrown error is
 * forwarded to `next()` instead of crashing the process or hanging the
 * request. Avoids repeating try/catch in every controller.
 */
export const catchAsync = (fn: AsyncHandler): RequestHandler => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
