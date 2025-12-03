import type { NextFunction, Request, Response } from 'express';
import { ResourceNotFoundError } from '../lib/errors/app.errors.js';

/**
 * 404 Not Found handler middleware
 * Should be mounted before the error handler but after all route handlers
 */
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  next(new ResourceNotFoundError(`Not found: ${req.method} ${req.path}`));
};
