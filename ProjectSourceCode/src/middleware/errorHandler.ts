import type { ErrorRequestHandler, Request, Response } from 'express';
import {
  DuplicateUserError,
  ForbiddenError,
  InvalidCredentialsError,
  ResourceNotFoundError,
  UserNotFoundError,
  ValidationError,
} from '../lib/errors/app.errors.js';
import { logger } from '../lib/logger.js';

interface ErrorMapping {
  // biome-ignore lint/suspicious/noExplicitAny: Error type checker functions accept any
  check: (err: any) => boolean;
  status: number;
  error: string;
  // biome-ignore lint/suspicious/noExplicitAny: Error handler needs to accept any error type
  // biome-ignore lint/suspicious/noConfusingVoidType: Express handlers can return void or Response
  handler?: (err: any, req: Request, res: Response) => Response | void;
}

function wantsJson(req: Request): boolean {
  return req.headers.accept?.includes('application/json') || req.path.startsWith('/api/');
}

const ERROR_MAPPINGS: Array<ErrorMapping> = [
  {
    check: DuplicateUserError.isDuplicateUserError,
    status: 409,
    error: 'User already exists',
  },
  {
    check: InvalidCredentialsError.isInvalidCredentialsError,
    status: 401,
    error: 'Invalid credentials',
  },
  {
    check: UserNotFoundError.isUserNotFoundError,
    status: 404,
    error: 'User not found',
  },
  {
    check: (err) => ValidationError.isValidationError(err) || /validation/i.test(err.message),
    status: 400,
    error: 'Validation error',
  },
  {
    check: (err) =>
      ResourceNotFoundError.isResourceNotFoundError(err) || /not found/i.test(err.message),
    status: 404,
    error: 'Not found',
    handler: (err, req, res) => {
      if (wantsJson(req)) {
        return res.status(404).json({ error: 'Not found', message: err.message });
      }
      return res
        .status(404)
        .render('errors/404', { message: err.message, title: '404 - Not Found' });
    },
  },
  {
    check: ForbiddenError.isForbiddenError,
    status: 403,
    error: 'Forbidden',
  },
  {
    check: (err) => err.message?.includes('Unauthorized') || err.message?.includes('Forbidden'),
    status: 403,
    error: 'Access denied',
  },
];

// biome-ignore lint/suspicious/noExplicitAny: Error handler needs to accept any error type
function findErrorMapping(err: any): ErrorMapping | undefined {
  return ERROR_MAPPINGS.find((mapping) => mapping.check(err));
}

// biome-ignore lint/suspicious/noExplicitAny: Error handler needs to accept any error type
// biome-ignore lint/suspicious/noConfusingVoidType: Express handlers can return void or Response
function handleInternalError(err: any, req: Request, res: Response): Response | void {
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (wantsJson(req)) {
    return res.status(500).json({
      error: 'Internal server error',
      message: isDevelopment ? err.message : undefined,
    });
  }

  res.status(500).render('errors/error', {
    error: isDevelopment ? err.message : 'Something went wrong',
    stack: isDevelopment ? err.stack : undefined,
    title: '500 - Server Error',
  });
}

export const errorHandler: ErrorRequestHandler = (
  // biome-ignore lint/suspicious/noExplicitAny: Error handler needs to accept any error type
  err: Error | any,
  req: Request,
  res: Response,
  _next
) => {
  logger.error(
    {
      err,
      requestId: req.headers['x-request-id'],
      path: req.path,
      method: req.method,
      userId: req.user?.id,
    },
    'Error handler'
  );

  const mapping = findErrorMapping(err);

  if (mapping) {
    if (mapping.handler) {
      return mapping.handler(err, req, res);
    }
    return res.status(mapping.status).json({ error: mapping.error, message: err.message });
  }

  return handleInternalError(err, req, res);
};
