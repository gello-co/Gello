/**
 * Request logging middleware
 * Logs HTTP requests with method, path, status code, and response time
 * Uses structured JSON logging with metadata for parseability and filtering
 */

import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger.js";

/**
 * Generate a unique request ID for tracking requests across logs
 */
function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Sanitize headers by removing sensitive fields
 * Returns a copy of headers with authorization and cookie removed
 */
function sanitizeHeaders(
  headers: Record<string, unknown>,
): Record<string, unknown> {
  const sanitized = { ...headers };
  delete sanitized.authorization;
  delete sanitized.cookie;
  return sanitized;
}

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const startTime = Date.now();
  const requestId = generateRequestId();

  // Log request when response finishes
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const method = req.method;
    const path = req.path;
    const statusCode = res.statusCode;
    const sanitizedHeaders = sanitizeHeaders(
      req.headers as Record<string, unknown>,
    );

    // Build metadata object for structured logging
    const metadata = {
      method,
      path,
      statusCode,
      duration,
      requestId,
      headers: sanitizedHeaders,
    };

    // Log errors (5xx) as errors, client errors (4xx) as warnings, others as info
    if (statusCode >= 500) {
      logger.error(metadata, `${method} ${path} ${statusCode} - ${duration}ms`);
    } else if (statusCode >= 400) {
      logger.warn(metadata, `${method} ${path} ${statusCode} - ${duration}ms`);
    } else {
      logger.info(metadata, `${method} ${path} ${statusCode} - ${duration}ms`);
    }
  });

  next();
}
