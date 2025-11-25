/**
 * Structured logging configuration using Pino
 * Provides production-ready logging with proper formatting and rotation
 *
 * Log rotation: Configured via LOG_FILE environment variable
 * - Production: Logs to file (JSON format) for aggregation
 * - Development: Pretty-printed console output
 * - Rotation: Handled by external tools (logrotate, PM2, systemd) or process managers
 */

import pino from "pino";

const isDevelopment = process.env.NODE_ENV === "development";
const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";
// Silent by default in test mode to reduce noise; override with LOG_LEVEL=debug for verbose test output
const logLevel =
  process.env.LOG_LEVEL ||
  (isTest ? "silent" : isDevelopment ? "debug" : "info");
const logFile = process.env.LOG_FILE;

/**
 * Redact sensitive fields from logs
 * Prevents authorization headers and cookies from being logged
 */
const redactPaths = [
  "req.headers.authorization",
  "req.headers.cookie",
  "headers.authorization",
  "headers.cookie",
  "authorization",
  "cookie",
];

/**
 * Create and configure Pino logger instance with fallback to console
 * - Development: Pretty printing for readability (console output)
 * - Production: JSON format for log aggregation
 *   - Console output by default
 *   - File output if LOG_FILE is set (rotation handled externally)
 * - Configurable log level via LOG_LEVEL environment variable
 * - Redacts sensitive fields (authorization, cookie)
 * - Falls back to console if initialization fails
 */
let loggerInstance: pino.Logger;

try {
  loggerInstance =
    isProduction && logFile
      ? pino(
          {
            level: logLevel,
            redact: redactPaths,
            formatters: {
              level: (label) => {
                return { level: label };
              },
            },
            timestamp: pino.stdTimeFunctions.isoTime,
            base: {
              env: process.env.NODE_ENV || "production",
            },
          },
          // File destination for production (rotation handled by logrotate/PM2/systemd)
          pino.destination({
            dest: logFile,
            sync: false, // Async writes for better performance
            mkdir: true, // Create log directory if it doesn't exist
          }),
        )
      : pino({
          level: logLevel,
          redact: redactPaths,
          ...(isDevelopment
            ? {
                // Pretty printing for development (console)
                transport: {
                  target: "pino-pretty",
                  options: {
                    colorize: true,
                    translateTime: "SYS:standard",
                    ignore: "pid,hostname",
                  },
                },
              }
            : {
                // JSON format for production (console, if LOG_FILE not set)
                formatters: {
                  level: (label) => {
                    return { level: label };
                  },
                },
                timestamp: pino.stdTimeFunctions.isoTime,
              }),
          base: {
            env: process.env.NODE_ENV || "development",
          },
        });
} catch (error) {
  // Fallback to console if logger initialization fails
  console.error(
    "Failed to initialize Pino logger, falling back to console:",
    error,
  );
  loggerInstance = pino({
    level: logLevel,
    redact: redactPaths,
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    },
  });
}

export const logger = loggerInstance;

/**
 * Create a child logger with additional context
 * Useful for adding request-specific metadata
 */
export function createChildLogger(context: Record<string, unknown>) {
  return logger.child(context);
}
