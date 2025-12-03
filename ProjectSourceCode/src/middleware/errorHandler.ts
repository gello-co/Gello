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
  // biome-ignore lint/suspicious/noExplicitAny: Error handler needs to accept any error type
  err: Error | any,
  req: Request,
  res: Response,
  _next,
) => {
  // Add request context to error logging
  logger.error(
    {
      err,
      requestId: req.headers["x-request-id"],
      path: req.path,
      method: req.method,
      userId: req.user?.id,
    },
    "Error handler",
  );

  // Custom application errors (using symbolic methods)
  if (DuplicateUserError.isDuplicateUserError(err)) {
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

  // Validation errors - prefer instanceof check, fallback to case-insensitive regex
  if (
    ValidationError.isValidationError(err) ||
    /validation/i.test(err.message)
  ) {
    return res.status(400).json({
      error: "Validation error",
      message: err.message,
    });
  }

  // Resource not found errors - prefer instanceof check, fallback to case-insensitive regex
  if (
    ResourceNotFoundError.isResourceNotFoundError(err) ||
    /not found/i.test(err.message)
  ) {
    // Check if client wants HTML or JSON
    const wantsJson = req.headers.accept?.includes("application/json");

    if (wantsJson || req.path.startsWith("/api/")) {
      return res.status(404).json({
        error: "Not found",
        message: err.message,
      });
    }

    // Render 404 page for browser requests
    return res.status(404).render("errors/404", {
      message: err.message,
      title: "404 - Not Found",
    });
  }

  // Forbidden errors
  if (ForbiddenError.isForbiddenError(err)) {
    return res.status(403).json({
      error: "Forbidden",
      message: err.message,
    });
  }

  // Authorization errors (fallback string matching)
  if (
    err.message.includes("Unauthorized") ||
    err.message.includes("Forbidden")
  ) {
    return res.status(403).json({
      error: "Access denied",
      message: err.message,
    });
  }

  // Default: Internal server error
  const wantsJson = req.headers.accept?.includes("application/json");
  const isDevelopment = process.env.NODE_ENV === "development";

  if (wantsJson || req.path.startsWith("/api/")) {
    return res.status(500).json({
      error: "Internal server error",
      message: isDevelopment ? err.message : undefined,
    });
  }

  // Render 500 error page for browser requests
  res.status(500).render("errors/error", {
    error: isDevelopment ? err.message : "Something went wrong",
    stack: isDevelopment ? err.stack : undefined,
    title: "500 - Server Error",
  });
};
