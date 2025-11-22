import type { ErrorRequestHandler, Request, Response } from "express";
import {
  DuplicateUserError,
  InvalidCredentialsError,
  ResourceNotFoundError,
  UserNotFoundError,
  ValidationError,
} from "../lib/errors/app.errors.js";

export const errorHandler: ErrorRequestHandler = (
  // biome-ignore lint/suspicious/noExplicitAny: Error handler needs to accept any error type
  err: Error | any,
  _req: Request,
  res: Response,
  _next,
) => {
  console.error("Error:", err);

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
    return res.status(404).json({
      error: "Not found",
      message: err.message,
    });
  }

  // Authorization errors
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
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
};
