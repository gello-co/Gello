import type { ErrorRequestHandler, Request, Response } from "express";
import {
  DuplicateUserError,
  ForbiddenError,
  InvalidCredentialsError,
  ResourceNotFoundError,
  UserNotFoundError,
  ValidationError,
} from "../lib/errors/app.errors.js";
import { logger } from "../lib/logger.js";

export const errorHandler: ErrorRequestHandler = (
  // biome-ignore lint/suspicious/noExplicitAny: Error handler needs to accept any error type from Express
  err: Error | any,
  req: Request,
  res: Response,
  _next,
) => {
  const isDevelopment =
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "test" ||
    process.env.NODE_ENV === undefined;

  // Compute the actual status code first
  let status = 500;
  if (DuplicateUserError.isDuplicateUserError(err)) {
    status = 409;
  } else if (InvalidCredentialsError.isInvalidCredentialsError(err)) {
    status = 401;
  } else if (UserNotFoundError.isUserNotFoundError(err)) {
    status = 404;
  } else if (ResourceNotFoundError.isResourceNotFoundError(err)) {
    status = 404;
  } else if (ForbiddenError.isForbiddenError(err)) {
    status = 403;
  } else if (ValidationError.isValidationError(err)) {
    status = 400;
  } else if (err.name === "ZodError" || err.issues) {
    status = 400;
  } else if (err.status === 404 || err.statusCode === 404) {
    status = 404;
  } else if (err.status === 403 || err.statusCode === 403) {
    status = 403;
  } else {
    status = err.statusCode || err.status || res.statusCode || 500;
  }

  // Ensure res.statusCode is set to the computed status
  if (!res.statusCode || res.statusCode === 200) {
    res.statusCode = status;
  }

  // Structured error logging with context (after status is determined)
  logger.error(
    {
      method: req.method,
      path: req.path,
      statusCode: status,
      error: {
        type: err.name || "Error",
        name: err.name,
        message: err.message,
        code: err.code,
        ...(isDevelopment && { stack: err.stack }),
      },
    },
    "Request error",
  );

  // CSRF error handling deferred to v0.2.0

  if (DuplicateUserError.isDuplicateUserError(err)) {
    // Custom application errors (using symbolic methods)
    return res.status(status).json({
      error: "User already exists",
      message: err.message,
    });
  }

  if (InvalidCredentialsError.isInvalidCredentialsError(err)) {
    return res.status(status).json({
      error: "Invalid credentials",
      message: err.message,
    });
  }

  if (UserNotFoundError.isUserNotFoundError(err)) {
    return res.status(status).json({
      error: "User not found",
      message: err.message,
    });
  }

  if (ResourceNotFoundError.isResourceNotFoundError(err)) {
    return res.status(status).json({
      error: "Not found",
      message: err.message,
    });
  }

  if (ForbiddenError.isForbiddenError(err)) {
    return res.status(status).json({
      error: "Access denied",
      message: err.message,
    });
  }

  if (ValidationError.isValidationError(err)) {
    // Validation errors (custom ValidationError)
    return res.status(status).json({
      error: "Validation error",
      message: err.message,
    });
  }

  if (err.name === "ZodError" || err.issues) {
    // Validation errors (Zod errors)
    return res.status(status).json({
      error: "Validation error",
      message: err.message,
      details: err.issues,
    });
  }

  // Generic "not found" errors
  if (err.status === 404 || err.statusCode === 404) {
    return res.status(status).json({
      error: "Not found",
      message: err.message,
    });
  }

  // Authorization errors - check both status code and message
  if (
    err.status === 403 ||
    err.statusCode === 403 ||
    err.message?.includes("Unauthorized") ||
    err.message?.includes("Forbidden")
  ) {
    const authStatus = err.status === 403 || err.statusCode === 403 ? 403 : 403;
    return res.status(authStatus).json({
      error: "Access denied",
      message: err.message,
    });
  }

  // Default: Internal server error
  // Always show error details in development (check both NODE_ENV and if message exists)
  // Ensure we're setting status to 500 for unhandled errors
  const finalStatus = status === 200 ? 500 : status;
  return res.status(finalStatus).json({
    error: "Internal server error",
    message: isDevelopment ? err.message || String(err) : undefined,
    stack: isDevelopment ? err.stack : undefined,
    name: isDevelopment ? err.name : undefined,
    code: isDevelopment ? err.code : undefined,
  });
};
