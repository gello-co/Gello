import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../../../ProjectSourceCode/src/server/lib/logger.js";
import { resetSharedClient } from "./db.js";

export async function cleanupTestData(client: SupabaseClient): Promise<void> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  logger.debug({ requestId }, "[db-cleanup] Starting fast TRUNCATE cleanup");

  // Retry logic for connection issues
  const maxRetries = 3;
  let lastError: Error | null = null;
  let currentClient = client;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        logger.debug(
          { requestId, attempt: attempt + 1 },
          "[db-cleanup] Retry attempt",
        );
        // Reset client to get fresh connection
        resetSharedClient();
        // Small delay before retry to allow connection to reset
        await new Promise((resolve) => setTimeout(resolve, attempt * 300));
        // Get fresh client for retry
        const { getTestSupabaseClient } = await import("./db.js");
        currentClient = getTestSupabaseClient();
      }

      // TRUNCATE all tables + delete auth users (via RPC function)
      // This is much faster than individual DELETE operations
      logger.debug(
        { requestId, attempt: attempt + 1 },
        "[db-cleanup] Calling truncate_all_tables RPC",
      );

      const { data, error } = await currentClient.rpc("truncate_all_tables");

      if (error) {
        // Check if it's a connection error that might be retryable
        const isConnectionError =
          error.code === "ECONNRESET" ||
          error.code === "UNKNOWN_CERTIFICATE_VERIFICATION_ERROR" ||
          error.message.includes("socket") ||
          error.message.includes("connection") ||
          error.message.includes("closed unexpectedly");

        logger.warn(
          {
            requestId,
            attempt: attempt + 1,
            error: error.message,
            code: error.code,
            isConnectionError,
            willRetry: isConnectionError && attempt < maxRetries - 1,
          },
          "[db-cleanup] RPC call failed",
        );

        if (isConnectionError && attempt < maxRetries - 1) {
          // Will retry with fresh client on next iteration
          continue;
        }

        logger.error(
          {
            requestId,
            attempt: attempt + 1,
            error: error.message,
            code: error.code,
            details: error.details,
          },
          "[db-cleanup] RPC truncate_all_tables failed (non-retryable or max retries)",
        );
        throw new Error(`Failed to truncate: ${error.message}`);
      }

      logger.debug(
        { requestId, rpcResult: data },
        "[db-cleanup] TRUNCATE RPC completed",
      );

      const duration = Date.now() - startTime;
      logger.info(
        { requestId, duration, attempts: attempt + 1 },
        "[db-cleanup] Cleanup completed",
      );
      return; // Success
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if it's a connection error that might be retryable
      const isConnectionError =
        lastError.message.includes("socket") ||
        lastError.message.includes("connection") ||
        lastError.message.includes("ECONNRESET") ||
        lastError.message.includes("closed unexpectedly") ||
        lastError.message.includes("certificate");

      logger.warn(
        {
          requestId,
          attempt: attempt + 1,
          error: lastError.message,
          isConnectionError,
          willRetry: isConnectionError && attempt < maxRetries - 1,
        },
        "[db-cleanup] Exception caught",
      );

      if (isConnectionError && attempt < maxRetries - 1) {
        // Will retry with fresh client on next iteration
        continue;
      }

      // Not retryable or out of retries
      logger.error(
        {
          requestId,
          attempt: attempt + 1,
          error: lastError.message,
        },
        "[db-cleanup] Cleanup failed (non-retryable or max retries)",
      );
      throw lastError;
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || new Error("Cleanup failed after retries");
}

// One-time seeding for integration tests (run once across all test processes)
// Uses file-based locking to ensure only one process performs the full reset
// Removed: No longer tracking seed state since we use TRUNCATE-only cleanup

export async function ensureSeededOnce(): Promise<void> {
  // This function is no longer needed with TRUNCATE-only approach
  // Database is seeded once when Supabase starts, tests just TRUNCATE and re-seed
  // Keeping function for compatibility but making it a no-op
  logger.debug(
    {},
    "[db-cleanup] Using TRUNCATE-only cleanup, no full reset needed",
  );
  return Promise.resolve();
}
