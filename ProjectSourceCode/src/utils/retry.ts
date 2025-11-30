import {NonRetryableError} from "../errors/NonRetryableError.js";
import {ResourceNotFoundError} from "../errors/ResourceNotFoundError.js";
import { RetryableError } from "../errors/RetryableError.js";
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
 * Well-known error codes that indicate retryable errors (transient failures)
 * Case-insensitive matching will be used
 */
const RETRYABLE_ERROR_CODES = [
  "ECONNRESET",
  "ECONNREFUSED",
  "ENOTFOUND",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "ENETUNREACH",
  "EHOSTUNREACH",
] as const;

/**
 * Well-known error codes that indicate non-retryable errors (business logic failures)
 * Case-insensitive matching will be used
 */
const NON_RETRYABLE_ERROR_CODES = [
  "PGRST116", // Supabase: Resource not found
  "23505", // Postgres: Unique violation
  "23503", // Postgres: Foreign key violation
  "23502", // Postgres: Not null violation
  "P0001", // Postgres: Raise exception
] as const;

/**
 * Well-known error names that indicate retryable errors
 * Case-insensitive matching will be used
 */
const RETRYABLE_ERROR_NAMES = [
  "TimeoutError",
  "NetworkError",
  "ConnectionError",
  "RetryableError",
] as const;

/**
 * Well-known error names that indicate non-retryable errors
 * Case-insensitive matching will be used
 */
const NON_RETRYABLE_ERROR_NAMES = [
  "ValidationError",
  "ResourceNotFoundError",
  "NonRetryableError",
  "ZodError",
] as const;

/**
 * Type guard to check if an error has a retryable flag property
 */
function hasRetryableFlag(error: unknown): error is { retryable: boolean } {
  return (
    error !== null &&
    typeof error === "object" &&
    "retryable" in error &&
    typeof (error as { retryable: unknown }).retryable === "boolean"
  );
}

/**
 * Case-insensitive string comparison helper
 */
function equalsIgnoreCase(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * Checks if a value matches any item in an array (case-insensitive)
 */
function matchesAny(value: string, items: readonly string[]): boolean {
  return items.some((item) => equalsIgnoreCase(value, item));
}

/**
 * Checks if an error is retryable (transient errors that may succeed on retry)
 *
 * Uses a priority-based strategy:
 * 1. Preserve existing ResourceNotFoundError guard
 * 2. Check well-known error codes and error names (case-insensitive)
 * 3. Check for typed flag or custom class property (retryable flag, instanceof RetryableError/NonRetryableError)
 * 4. Fall back to existing lower-cased message checks
 *
 * Business logic errors (ResourceNotFoundError, validation errors) are NOT retryable.
 * Only transient errors (database connection, network issues) are retryable.
 */
export function isRetryableError(error: unknown): boolean {
  // Priority 1: Preserve existing ResourceNotFoundError guard
  if (ResourceNotFoundError.isResourceNotFoundError(error)) {
    return false;
  }

  // Handle non-Error inputs robustly
  if (!(error instanceof Error)) {
    return false;
  }

  // Priority 2: Check well-known error codes (case-insensitive)
  const errorCode = (error as { code?: string }).code;
  if (errorCode && typeof errorCode === "string") {
    if (matchesAny(errorCode, NON_RETRYABLE_ERROR_CODES)) {
      return false;
    }
    if (matchesAny(errorCode, RETRYABLE_ERROR_CODES)) {
      return true;
    }
  }

  // Priority 2: Check well-known error names (case-insensitive)
  const errorName = error.name;
  if (errorName && typeof errorName === "string") {
    if (matchesAny(errorName, NON_RETRYABLE_ERROR_NAMES)) {
      return false;
    }
    if (matchesAny(errorName, RETRYABLE_ERROR_NAMES)) {
      return true;
    }
  }

  // Priority 3: Check for typed flag or custom class property
  if (hasRetryableFlag(error)) {
    return error.retryable;
  }

  if (RetryableError.isRetryableError(error)) {
    return true;
  }

  if (NonRetryableError.isNonRetryableError(error)) {
    return false;
  }

  // Priority 4: Fall back to existing lower-cased message checks
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
      lastError = error instanceof Error ? error : new Error(String(error));

      // Only retry on transient errors
      if (attempt < maxRetries - 1 && isRetryableError(error)) {
        // Calculate exponential delay with cap to prevent unbounded delays
        const exponentialDelay = initialDelay * 2 ** attempt;
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
