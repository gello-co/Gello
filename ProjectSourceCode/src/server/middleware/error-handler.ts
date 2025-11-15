import type { ErrorRequestHandler, Request, Response } from "express";
import {
  DuplicateUserError,
  InvalidCredentialsError,
  UserNotFoundError,
} from "../../lib/errors/app.errors.js";

export const errorHandler: ErrorRequestHandler = (
  err: Error | any,
  req: Request,
  res: Response,
  _next,
) => {
  console.error("Error:", err);
  console.error("Error stack:", err.stack);
  console.error("Error name:", err.name);
  console.error("Error code:", err.code);

  if (err.code === "EBADCSRFTOKEN" || err.message?.includes("CSRF")) {
    // CSRF errors (from csurf)
    return res.status(403).json({
      error: "CSRF token validation failed",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }

  if (DuplicateUserError.isDuplicateUserError(err)) {
    // Custom application errors (using symbolic methods)
    return res.status(409).json({
      error: "User already exists",
      message: err.message,
    });
  }

  if (InvalidCredentialsError.isInvalidCredentialsError(err)) {
    return res.status(401).json({
      error: "Invalid credentials",
      message: err.message,
    });
  }

  if (UserNotFoundError.isUserNotFoundError(err)) {
    return res.status(404).json({
      error: "User not found",
      message: err.message,
    });
  }

  if (err.name === "ZodError" || err.issues) {
    // Validation errors (Zod errors)
    return res.status(400).json({
      error: "Validation error",
      message: err.message,
      details: err.issues,
    });
  }

  // Generic "not found" errors
  if (err.status === 404 || err.statusCode === 404) {
    return res.status(404).json({
      error: "Not found",
      message: err.message,
    });
  }

  // Authorization errors
  if (err.status === 403 || err.statusCode === 403) {
    return res.status(403).json({
      error: "Access denied",
      message: err.message,
    });
  }

  // Default: Internal server error
  // Always show error details in development (check both NODE_ENV and if message exists)
  const isDevelopment =
    process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
  return res.status(500).json({
    error: "Internal server error",
    message: isDevelopment ? err.message || String(err) : undefined,
    stack: isDevelopment ? err.stack : undefined,
    name: isDevelopment ? err.name : undefined,
    code: isDevelopment ? err.code : undefined,
  });
};
