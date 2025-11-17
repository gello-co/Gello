import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../../../ProjectSourceCode/src/server/lib/logger.js";

export async function cleanupTestData(client: SupabaseClient): Promise<void> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  logger.debug({ requestId }, "[db-cleanup] Starting fast TRUNCATE cleanup");

  try {
    // TRUNCATE all tables + delete auth users (via RPC function)
    // This is much faster than individual DELETE operations
    const { data, error } = await client.rpc("truncate_all_tables");

    if (error) {
      logger.error(
        {
          requestId,
          error: error.message,
          code: error.code,
          details: error.details,
        },
        "[db-cleanup] RPC truncate_all_tables failed",
      );
      throw new Error(`Failed to truncate: ${error.message}`);
    }

    logger.debug(
      { requestId, rpcResult: data },
      "[db-cleanup] TRUNCATE RPC completed",
    );

    const duration = Date.now() - startTime;
    logger.info({ requestId, duration }, "[db-cleanup] Cleanup completed");
  } catch (error) {
    logger.error(
      {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      },
      "[db-cleanup] Cleanup failed",
    );
    throw error;
  }
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
