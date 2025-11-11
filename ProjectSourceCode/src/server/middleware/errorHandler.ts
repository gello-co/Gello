import type { ErrorRequestHandler, Request, Response } from "express";

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next,
) => {
  console.error("Error:", err);

  if (err.name === "ValidationError" || err.message.includes("validation")) {
    return res.status(400).json({
      error: "Validation error",
      message: err.message,
    });
  }

  if (err.message.includes("not found")) {
    return res.status(404).json({
      error: "Not found",
      message: err.message,
    });
  }

  if (
    err.message.includes("Unauthorized") ||
    err.message.includes("Forbidden")
  ) {
    return res.status(403).json({
      error: "Access denied",
      message: err.message,
    });
  }

  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
};
