/**
 * Request logging middleware
 * Logs HTTP requests with method, path, status code, and response time
 */

import type { NextFunction, Request, Response } from "express";

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const startTime = Date.now();

  // Log request when response finishes
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const method = req.method;
    const path = req.path;
    const statusCode = res.statusCode;
    const statusMessage = res.statusMessage || "";

    // Format log message
    const logMessage = `${method} ${path} ${statusCode} ${statusMessage} - ${duration}ms`;

    // Log errors (4xx, 5xx) as errors, others as info
    if (statusCode >= 500) {
      console.error(`[ERROR] ${logMessage}`);
    } else if (statusCode >= 400) {
      console.warn(`[WARN] ${logMessage}`);
    } else {
      console.log(`[INFO] ${logMessage}`);
    }
  });

  next();
}
