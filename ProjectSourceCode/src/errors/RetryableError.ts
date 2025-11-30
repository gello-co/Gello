export const RETRYABLE_ERROR = Symbol("RetryableError");

export class RetryableError extends Error {
  constructor(message: string = "Retryable error occurred") {
    super(message);
    this.name = "RetryableError";
    Error.captureStackTrace(this, this.constructor);
  }

  static isRetryableError(error: unknown): error is RetryableError {
    return (
      error instanceof RetryableError ||
      (error !== null && typeof error === "object" && RETRYABLE_ERROR in error)
    );
  }
}

