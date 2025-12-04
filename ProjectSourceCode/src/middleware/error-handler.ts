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
  getResponse?: (err: any) => Record<string, unknown>;
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
    check: ResourceNotFoundError.isResourceNotFoundError,
    status: 404,
    error: 'Not found',
  },
  {
    check: ForbiddenError.isForbiddenError,
    status: 403,
    error: 'Access denied',
  },
  {
    check: ValidationError.isValidationError,
    status: 400,
    error: 'Validation error',
  },
  {
    check: (err) => err.name === 'ZodError' || err.issues,
    status: 400,
    error: 'Validation error',
    getResponse: (err) => ({ details: err.issues }),
  },
  {
    check: (err) => err.status === 404 || err.statusCode === 404,
    status: 404,
    error: 'Not found',
  },
  {
    check: (err) =>
      err.status === 403 ||
      err.statusCode === 403 ||
      err.message?.includes('Unauthorized') ||
      err.message?.includes('Forbidden'),
    status: 403,
    error: 'Access denied',
  },
];

// biome-ignore lint/suspicious/noExplicitAny: Error handler needs to accept any error type
function findErrorMapping(err: any): ErrorMapping | undefined {
  return ERROR_MAPPINGS.find((mapping) => mapping.check(err));
}

// biome-ignore lint/suspicious/noExplicitAny: Error handler needs to accept any error type
function determineStatus(err: any, res: Response): number {
  const mapping = findErrorMapping(err);
  if (mapping) return mapping.status;
  return err.statusCode || err.status || res.statusCode || 500;
}

function isDevelopmentEnv(): boolean {
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === 'test' ||
    process.env.NODE_ENV === undefined
  );
}

// biome-ignore lint/suspicious/noExplicitAny: Error handler needs to accept any error type
function logError(err: any, req: Request, status: number, isDev: boolean): void {
  logger.error(
    {
      method: req.method,
      path: req.path,
      statusCode: status,
      error: {
        type: err.name || 'Error',
        name: err.name,
        message: err.message,
        code: err.code,
        ...(isDev && { stack: err.stack }),
      },
    },
    'Request error'
  );
}

// biome-ignore lint/suspicious/noExplicitAny: Error handler needs to accept any error type
function buildErrorResponse(err: any, mapping: ErrorMapping | undefined, isDev: boolean): object {
  if (mapping) {
    return {
      error: mapping.error,
      message: err.message,
      ...(mapping.getResponse?.(err) || {}),
    };
  }

  // Default: Internal server error
  return {
    error: 'Internal server error',
    message: isDev ? err.message || String(err) : undefined,
    stack: isDev ? err.stack : undefined,
    name: isDev ? err.name : undefined,
    code: isDev ? err.code : undefined,
  };
}

export const errorHandler: ErrorRequestHandler = (
  // biome-ignore lint/suspicious/noExplicitAny: Error handler needs to accept any error type from Express
  err: Error | any,
  req: Request,
  res: Response,
  _next
) => {
  const isDev = isDevelopmentEnv();
  const status = determineStatus(err, res);

  // Ensure res.statusCode is set
  if (!res.statusCode || res.statusCode === 200) {
    res.statusCode = status;
  }

  logError(err, req, status, isDev);

  const mapping = findErrorMapping(err);
  const finalStatus = status === 200 ? 500 : status;
  const response = buildErrorResponse(err, mapping, isDev);

  return res.status(finalStatus).json(response);
};
