/**
 * Custom application error classes
 * Used for proper HTTP status code mapping in error handler
 * Uses symbolic methods for type identification (more robust than instanceof)
 */

// Symbols for error type identification
export const NON_RETRYABLE_ERROR = Symbol("NonRetryableError");

export class NonRetryableError extends Error {
  constructor(message: string = "Non-retryable error occurred") {
    super(message);
    this.name = "NonRetryableError";
    Error.captureStackTrace(this, this.constructor);
  }

  static isNonRetryableError(error: unknown): error is NonRetryableError {
    return (
      error instanceof NonRetryableError ||
      (error !== null &&
        typeof error === "object" &&
        NON_RETRYABLE_ERROR in error)
    );
  }
}
