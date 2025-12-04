import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../../../ProjectSourceCode/src/lib/logger.js';
import { resetSharedClient } from './db.js';

interface CleanupError {
  code?: string;
  message: string;
  details?: string;
}

interface CleanupContext {
  requestId: string;
  startTime: number;
  maxRetries: number;
}

function isConnectionError(error: CleanupError | Error): boolean {
  const message = error.message;
  const code = 'code' in error ? error.code : undefined;

  return (
    code === 'ECONNRESET' ||
    code === 'UNKNOWN_CERTIFICATE_VERIFICATION_ERROR' ||
    message.includes('socket') ||
    message.includes('connection') ||
    message.includes('closed unexpectedly') ||
    message.includes('certificate')
  );
}

async function getFreshClient(): Promise<SupabaseClient> {
  resetSharedClient();
  const { getTestSupabaseClient } = await import('./db.js');
  return getTestSupabaseClient();
}

async function attemptCleanup(
  client: SupabaseClient,
  requestId: string,
  attempt: number
): Promise<{ success: boolean; error?: CleanupError }> {
  logger.debug({ requestId, attempt: attempt + 1 }, '[db-cleanup] Calling truncate_all_tables RPC');

  const { data, error } = await client.rpc('truncate_all_tables');

  if (error) {
    logger.warn(
      {
        requestId,
        attempt: attempt + 1,
        error: error.message,
        code: error.code,
        isConnectionError: isConnectionError(error),
      },
      '[db-cleanup] RPC call failed'
    );
    return { success: false, error };
  }

  logger.debug({ requestId, rpcResult: data }, '[db-cleanup] TRUNCATE RPC completed');
  return { success: true };
}

function logCleanupSuccess(ctx: CleanupContext, attempt: number): void {
  const duration = Date.now() - ctx.startTime;
  logger.info(
    { requestId: ctx.requestId, duration, attempts: attempt + 1 },
    '[db-cleanup] Cleanup completed'
  );
}

function handleCleanupException(
  error: unknown,
  ctx: CleanupContext,
  attempt: number,
  canRetry: boolean
): { lastError: Error; shouldContinue: boolean } {
  const lastError = error instanceof Error ? error : new Error(String(error));
  const shouldRetry = isConnectionError(lastError) && canRetry;

  logger.warn(
    {
      requestId: ctx.requestId,
      attempt: attempt + 1,
      error: lastError.message,
      willRetry: shouldRetry,
    },
    '[db-cleanup] Exception caught'
  );

  if (shouldRetry) {
    return { lastError, shouldContinue: true };
  }

  logger.error(
    { requestId: ctx.requestId, attempt: attempt + 1, error: lastError.message },
    '[db-cleanup] Cleanup failed (non-retryable or max retries)'
  );

  return { lastError, shouldContinue: false };
}

export async function cleanupTestData(client: SupabaseClient): Promise<void> {
  const ctx: CleanupContext = {
    requestId: crypto.randomUUID(),
    startTime: Date.now(),
    maxRetries: 3,
  };

  logger.debug({ requestId: ctx.requestId }, '[db-cleanup] Starting fast TRUNCATE cleanup');

  let currentClient = client;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < ctx.maxRetries; attempt++) {
    const canRetry = attempt < ctx.maxRetries - 1;

    // Refresh client on retry
    if (attempt > 0) {
      logger.debug(
        { requestId: ctx.requestId, attempt: attempt + 1 },
        '[db-cleanup] Retry attempt'
      );
      await new Promise((resolve) => setTimeout(resolve, attempt * 300));
      currentClient = await getFreshClient();
    }

    const result = await attemptCleanupWithErrorHandling(currentClient, ctx, attempt, canRetry);

    if (result.success) return;
    if (result.error) lastError = result.error;
    if (!result.shouldContinue) throw result.error || new Error('Cleanup failed');
  }

  throw lastError || new Error('Cleanup failed after retries');
}

async function attemptCleanupWithErrorHandling(
  client: SupabaseClient,
  ctx: CleanupContext,
  attempt: number,
  canRetry: boolean
): Promise<{ success: boolean; shouldContinue: boolean; error?: Error }> {
  try {
    const result = await attemptCleanup(client, ctx.requestId, attempt);

    if (result.success) {
      logCleanupSuccess(ctx, attempt);
      return { success: true, shouldContinue: false };
    }

    if (result.error) {
      const shouldRetry = isConnectionError(result.error) && canRetry;
      if (shouldRetry) return { success: false, shouldContinue: true };
      return {
        success: false,
        shouldContinue: false,
        error: new Error(`Failed to truncate: ${result.error.message}`),
      };
    }

    return { success: false, shouldContinue: false };
  } catch (error) {
    const handled = handleCleanupException(error, ctx, attempt, canRetry);
    return { success: false, shouldContinue: handled.shouldContinue, error: handled.lastError };
  }
}

// One-time seeding for integration tests (run once across all test processes)
// Uses file-based locking to ensure only one process performs the full reset
// Removed: No longer tracking seed state since we use TRUNCATE-only cleanup

export async function ensureSeededOnce(): Promise<void> {
  // This function is no longer needed with TRUNCATE-only approach
  // Database is seeded once when Supabase starts, tests just TRUNCATE and re-seed
  // Keeping function for compatibility but making it a no-op
  logger.debug({}, '[db-cleanup] Using TRUNCATE-only cleanup, no full reset needed');
  return Promise.resolve();
}
