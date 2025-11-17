import { ResourceNotFoundError } from "../errors/app.errors.js";

/**
 * Configuration for retry behavior
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 100, // milliseconds
  maxDelay: 5000, // Maximum delay cap in milliseconds (prevents unbounded delays)
  jitterMin: 0.5, // Minimum jitter factor
  jitterMax: 1.5, // Maximum jitter factor
} as const;

/**
 * Checks if an error is retryable (transient errors that may succeed on retry)
 *
 * Business logic errors (ResourceNotFoundError, validation errors) are NOT retryable.
 * Only transient errors (database connection, network issues) are retryable.
 */
export function isRetryableError(error: unknown): boolean {
  // Don't retry on business logic errors
  if (ResourceNotFoundError.isResourceNotFoundError(error)) {
    return false;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  // Don't retry on business logic errors
  if (
    message.includes("already completed") ||
    message.includes("not found") ||
    message.includes("invalid") ||
    message.includes("validation")
  ) {
    return false;
  }

  // Retry on transient errors (database connection, network issues)
  return (
    message.includes("connection") ||
    message.includes("timeout") ||
    message.includes("network") ||
    message.includes("econnreset") ||
    message.includes("fetch failed") ||
    message.includes("failed to create") ||
    message.includes("failed to update")
  );
}

/**
 * Retries an async operation with exponential backoff
 *
 * Only retries on transient errors (connection, network issues).
 * Business logic errors are not retried.
 *
 * Uses capped exponential backoff with jitter to prevent thundering-herd
 * problems and unbounded delays.
 *
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param initialDelay - Initial delay in milliseconds (default: 100ms)
 * @returns Result of the function
 * @throws Last error if all retries fail
 *
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   () => pointsService.awardPointsForTaskCompletion(taskId, userId),
 *   3,
 *   100
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = RETRY_CONFIG.maxRetries,
  initialDelay: number = RETRY_CONFIG.initialDelay,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Only retry on transient errors
      if (attempt < maxRetries - 1 && isRetryableError(error)) {
        // Calculate exponential delay with cap to prevent unbounded delays
        const exponentialDelay = initialDelay * Math.pow(2, attempt);
        const cappedDelay = Math.min(RETRY_CONFIG.maxDelay, exponentialDelay);

        // Apply jitter to prevent thundering-herd problems
        const jitterFactor =
          RETRY_CONFIG.jitterMin +
          Math.random() * (RETRY_CONFIG.jitterMax - RETRY_CONFIG.jitterMin);
        const delay = Math.floor(cappedDelay * jitterFactor);

        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Don't retry on business logic errors or if max retries reached
      throw error;
    }
  }

  throw lastError || new Error("Retry failed");
}
