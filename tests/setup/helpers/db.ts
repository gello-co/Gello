import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../../../ProjectSourceCode/src/lib/logger.js';
import { cleanupTestData } from './db-cleanup.js';
import { acquireDbLock } from './db-lock.js';

/**
 * Shared configuration + utilities for Supabase-backed tests.
 */

export const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 100,
  registerTimeout: 3000,
  userSyncRetries: 5,
  userSyncDelay: 200,
  cleanupDelay: 100,
} as const;

function getSupabaseUrl(): string {
  const url = process.env.SUPABASE_LOCAL_URL || process.env.SUPABASE_URL || process.env.SB_URL;
  if (!url) {
    throw new Error("Missing SUPABASE_URL. Run 'bunx supabase status -o env' to load credentials.");
  }
  return url;
}

function getSupabaseServiceKey(): string {
  const key =
    process.env.SERVICE_ROLE_KEY ||
    process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SB_SERVICE_ROLE_KEY ||
    process.env.SECRET_KEY;
  if (!key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Run 'bunx supabase status -o env' to load credentials."
    );
  }
  return key;
}

function getSupabaseAnonKey(): string {
  const key =
    process.env.PUBLISHABLE_KEY ||
    process.env.SUPABASE_LOCAL_ANON_KEY ||
    process.env.ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SB_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error(
      "Missing SUPABASE_ANON_KEY. Run 'bunx supabase status -o env' to load credentials."
    );
  }
  return key;
}

// Lazy validation: validate only when functions are called, not at module load
// This ensures bun-setup.ts has time to load environment variables via preload

const SUPABASE_RESET_COMMAND =
  process.env.SUPABASE_RESET_COMMAND ?? 'bunx supabase db reset --local --yes --no-seed';

async function execCommand(
  command: string,
  label: string,
  timeoutMs = 15000 // 15 seconds should be plenty for local Supabase operations
): Promise<void> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  logger.info(
    {
      requestId,
      command,
      label,
      timeoutMs,
      pid: process.pid,
    },
    `[db] Starting: ${label}`
  );

  return new Promise((resolve, reject) => {
    // Set AUTH_SITE_URL if not set (required by Supabase CLI)
    const env = {
      ...process.env,
      AUTH_SITE_URL:
        process.env.AUTH_SITE_URL || process.env.SUPABASE_URL || 'http://localhost:54321',
    };

    // Use shell for commands to handle bunx package resolution properly
    const child = spawn(command, {
      stdio: 'pipe',
      env,
      shell: true,
    });

    let stdout = '';
    let stderr = '';
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    logger.debug(
      {
        requestId,
        label,
        childPid: child.pid,
      },
      `[db] Spawned process for ${label}`
    );

    // Set timeout for command execution
    timeoutId = setTimeout(() => {
      if (child.killed) {
        return; // Already killed
      }
      const duration = Date.now() - startTime;
      logger.error(
        {
          requestId,
          label,
          timeoutMs,
          duration,
          childPid: child.pid,
          stdoutLength: stdout.length,
          stderrLength: stderr.length,
        },
        `[db] Timeout after ${timeoutMs}ms: ${label}`
      );
      child.kill('SIGTERM');
      // Give it a moment, then force kill
      setTimeout(() => {
        if (!child.killed) {
          logger.warn(
            {
              requestId,
              label,
              childPid: child.pid,
            },
            `[db] Force killing process for ${label}`
          );
          child.kill('SIGKILL');
        }
      }, 1000);
      reject(
        new Error(
          `Failed to ${label}: Command timed out after ${timeoutMs}ms\n` +
            `Suggestion: Check if Supabase is running: bunx supabase status\n` +
            `Output so far:\n${stdout}\n${stderr}`
        )
      );
    }, timeoutMs);

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
      // Log progress for long-running commands
      if (label.includes('reset')) {
        const lines = stdout.split('\n').filter(Boolean);
        const lastLine = lines[lines.length - 1];
        if (
          lastLine &&
          (lastLine.includes('Applying migration') ||
            lastLine.includes('Restarting containers') ||
            lastLine.includes('Finished'))
        ) {
          logger.info(
            {
              requestId,
              label,
              progress: lastLine,
            },
            `[db] ${lastLine}`
          );
        }
      }
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
      logger.debug(
        {
          requestId,
          label,
          stderrChunk: data.toString().substring(0, 200),
        },
        `[db] stderr from ${label}`
      );
    });

    child.on('error', (error) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      const duration = Date.now() - startTime;
      logger.error(
        {
          requestId,
          label,
          duration,
          error: error.message,
          errorName: error.name,
          stdoutLength: stdout.length,
          stderrLength: stderr.length,
        },
        `[db] Failed: ${label} - ${error.message}`
      );
      reject(new Error(`Failed to ${label}: ${error.message}\n${stdout}\n${stderr}`));
    });

    child.on('close', (code) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      const duration = Date.now() - startTime;
      // Only accept code === 0 as success
      // Null exit code indicates process was killed, which is a failure
      if (code === 0) {
        logger.info(
          {
            requestId,
            label,
            duration,
            exitCode: code,
            stdoutLength: stdout.length,
            stderrLength: stderr.length,
          },
          `[db] Completed: ${label}`
        );
        resolve();
      } else {
        logger.error(
          {
            requestId,
            label,
            duration,
            exitCode: code ?? 'null',
            stdoutLength: stdout.length,
            stderrLength: stderr.length,
            stdoutPreview: stdout.substring(0, 500),
            stderrPreview: stderr.substring(0, 500),
          },
          `[db] Failed: ${label} (code: ${code ?? 'null'})`
        );
        const details = [stdout, stderr].filter(Boolean).join('\n');
        const suggestion =
          code === null
            ? 'Process was killed. Check if Supabase is running: bunx supabase status'
            : 'Check Supabase logs: bunx supabase logs';

        reject(
          new Error(
            `Failed to ${label}: Command exited with code ${code ?? 'null (process killed)'}\n` +
              `Suggestion: ${suggestion}\n` +
              `Details:\n${details}`
          )
        );
      }
    });
  });
}

interface ReadinessCheckResult {
  ready: boolean;
  error?: { code?: string; message?: string };
  isNotFoundError?: boolean;
}

/**
 * Check if error indicates table not found (schema not ready).
 */
function isTableNotFoundError(error: { code?: string; message?: string }): boolean {
  return (
    error.code === 'PGRST116' ||
    error.code === 'PGRST301' ||
    error.code === '404' ||
    error.message?.includes('schema cache') === true
  );
}

/**
 * Perform a single database readiness check.
 */
async function checkDatabaseReady(client: SupabaseClient): Promise<ReadinessCheckResult> {
  const { error } = await client.from('users').select('id').limit(1);

  if (!error) {
    return { ready: true };
  }

  return {
    ready: false,
    error,
    isNotFoundError: isTableNotFoundError(error),
  };
}

/**
 * Log retry attempt for database readiness.
 */
function logRetryAttempt(
  requestId: string,
  attempt: number,
  error: { code?: string; message?: string },
  delayMs: number,
  reason: string
): void {
  logger.debug(
    { requestId, attempt, errorCode: error.code, errorMessage: error.message, delayMs },
    `[db] ${reason}`
  );
}

/**
 * Create database ready error with helpful message.
 */
function createDatabaseError(
  requestId: string,
  attempt: number,
  duration: number,
  error: { code?: string; message?: string },
  isNotFound: boolean
): Error {
  logger.error(
    { requestId, attempt, duration, errorCode: error.code, errorMessage: error.message },
    isNotFound ? '[db] Database not ready: users table not found' : '[db] Database connection error'
  );

  if (isNotFound) {
    return new Error(
      `Database not ready: users table not found after ${duration}ms. ` +
        `Migrations may not have been applied. Check Supabase is running: bunx supabase status`
    );
  }

  return new Error(
    `Database connection error: ${error.message}. Check Supabase is running: bunx supabase status`
  );
}

interface ReadinessContext {
  requestId: string;
  startTime: number;
  maxRetries: number;
  delayMs: number;
}

/**
 * Handle a single readiness check iteration.
 * Returns: { done: true } if ready, { done: false, shouldRetry: true } to continue, throws on fatal error.
 */
async function handleReadinessIteration(
  client: SupabaseClient,
  ctx: ReadinessContext,
  attempt: number,
  canRetry: boolean
): Promise<{ done: boolean; shouldRetry: boolean }> {
  const result = await checkDatabaseReady(client);

  if (result.ready) {
    const duration = Date.now() - ctx.startTime;
    logger.info({ requestId: ctx.requestId, attempt, duration }, '[db] Database is ready');
    return { done: true, shouldRetry: false };
  }

  if (canRetry && result.error) {
    const reason = result.isNotFoundError
      ? 'Table not found, retrying'
      : 'Database connection error, retrying';
    logRetryAttempt(ctx.requestId, attempt, result.error, ctx.delayMs, reason);
    return { done: false, shouldRetry: true };
  }

  // Exhausted retries
  if (result.error) {
    const duration = Date.now() - ctx.startTime;
    throw createDatabaseError(
      ctx.requestId,
      attempt,
      duration,
      result.error,
      result.isNotFoundError ?? false
    );
  }

  return { done: false, shouldRetry: false };
}

/**
 * Handle unexpected exception during readiness check.
 */
function handleReadinessException(
  err: unknown,
  ctx: ReadinessContext,
  attempt: number,
  canRetry: boolean
): { shouldRetry: boolean } {
  // Re-throw our own errors
  if (err instanceof Error && err.message.includes('Database')) {
    throw err;
  }

  const errorMsg = err instanceof Error ? err.message : String(err);

  if (canRetry) {
    logger.debug(
      { requestId: ctx.requestId, attempt, error: errorMsg, delayMs: ctx.delayMs },
      '[db] Exception during readiness check, retrying'
    );
    return { shouldRetry: true };
  }

  // Exhausted retries with exception
  const duration = Date.now() - ctx.startTime;
  logger.error(
    { requestId: ctx.requestId, attempt, duration, error: errorMsg },
    '[db] Database not ready after retries'
  );
  throw new Error(
    `Database not ready after ${duration}ms: ${errorMsg}. Check Supabase is running: bunx supabase status`
  );
}

/**
 * Wait for database to be ready after reset.
 * Queries the database to verify it's ready to accept connections and migrations are applied.
 */
async function waitForDatabaseReady(
  client: SupabaseClient,
  maxRetries = 20,
  delayMs = 250
): Promise<void> {
  const ctx: ReadinessContext = {
    requestId: crypto.randomUUID(),
    startTime: Date.now(),
    maxRetries,
    delayMs,
  };

  logger.debug(
    { requestId: ctx.requestId, maxRetries, delayMs },
    '[db] Waiting for database to be ready'
  );

  for (let i = 0; i < maxRetries; i++) {
    const attempt = i + 1;
    const canRetry = i < maxRetries - 1;

    try {
      const result = await handleReadinessIteration(client, ctx, attempt, canRetry);
      if (result.done) return;
      if (result.shouldRetry) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    } catch (err) {
      const { shouldRetry } = handleReadinessException(err, ctx, attempt, canRetry);
      if (shouldRetry) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
}

export async function seedTestData(): Promise<void> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  logger.info(
    {
      requestId,
    },
    '[db] Starting test data seeding'
  );

  // Get client to check readiness
  const client = getTestSupabaseClient();

  // Wait for database to be ready (local Supabase is typically instant)
  // If called after resetTestDb(), this is a double-check
  await waitForDatabaseReady(client, 10, 250); // 10 retries * 250ms = 2.5s max

  try {
    logger.debug(
      {
        requestId,
      },
      '[db] Running seed script'
    );
    // Run seed-simple.ts script via bun spawn
    await new Promise<void>((resolve, reject) => {
      const seedProcess = spawn('bun', ['run', 'scripts/seed-simple.ts'], {
        env: process.env,
        cwd: process.cwd(),
      });

      let stdout = '';
      let stderr = '';

      seedProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      seedProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      seedProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          const message = `Seed script failed with code ${code}\nstdout: ${stdout}\nstderr: ${stderr}`;
          logger.error(
            {
              requestId,
              exitCode: code,
              stdoutLength: stdout.length,
              stderrLength: stderr.length,
            },
            `[db] ${message}`
          );
          reject(new Error(message));
        }
      });

      seedProcess.on('error', (err) => {
        logger.error(
          {
            requestId,
            error: err.message,
          },
          '[db] Seed script spawn error'
        );
        reject(err);
      });
    });
    const duration = Date.now() - startTime;
    logger.info(
      {
        requestId,
        duration,
      },
      '[db] Test data seeding completed'
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : `Unknown error: ${String(error)}`;
    logger.error(
      {
        requestId,
        duration,
        error: message,
      },
      '[db] Failed to seed test data'
    );
    throw new Error(`Failed to seed test data via Snaplet: ${message}`);
  }
}

let sharedClient: SupabaseClient | null = null;

export function resetSharedClient(): void {
  sharedClient = null;
}

let sharedAnonClient: SupabaseClient | null = null;

export async function resetAnonSupabaseClient(): Promise<void> {
  if (!sharedAnonClient) {
    return;
  }

  try {
    await sharedAnonClient.auth.signOut();
  } catch (error) {
    logger.warn(
      { error: error instanceof Error ? error.message : String(error) },
      '[db] Failed to sign out shared anon client during reset'
    );
  } finally {
    sharedAnonClient = null;
  }
}

function createFetchWithTLS(
  _isLocalhost: boolean
): (url: RequestInfo | URL, options?: RequestInit) => Promise<Response> {
  return (url: RequestInfo | URL, options?: RequestInit) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const existingSignal = options?.signal;
    let abortListener: (() => void) | null = null;

    if (existingSignal) {
      abortListener = () => controller.abort();
      existingSignal.addEventListener('abort', abortListener);
    }

    const fetchOptions: RequestInit = {
      ...options,
      signal: controller.signal,
    };

    if (options?.headers) {
      fetchOptions.headers = new Headers(options.headers as HeadersInit);
    }

    // Use Bun's native fetch which supports TLS options
    // This bypasses happy-dom's fetch (which overrides global fetch) and doesn't support TLS configuration
    // Bun.fetch is always available in Bun runtime and supports TLS options via fetchOptions.tls
    const fetchImpl = typeof Bun !== 'undefined' ? Bun.fetch : fetch;

    // Note: TLS configuration removed - using HTTP for local Supabase to avoid WSL2/Docker TLS handshake issues
    // See: .agents/tmp/mkcert-implementation-status.md for details
    // If TLS is re-enabled in the future, uncomment the TLS configuration below:
    /*
    if (typeof Bun !== "undefined" && isLocalhost) {
      const mkcertCA = getMkcertCACert();
      if (mkcertCA) {
        (fetchOptions as any).tls = {
          ca: mkcertCA,
          rejectUnauthorized: true,
        };
      } else {
        (fetchOptions as any).tls = {
          rejectUnauthorized: false,
        };
      }
    }
    */

    return fetchImpl(url, fetchOptions).finally(() => {
      clearTimeout(timeoutId);
      if (existingSignal && abortListener) {
        existingSignal.removeEventListener('abort', abortListener);
      }
    });
  };
}

export function getTestSupabaseClient(): SupabaseClient {
  if (!sharedClient) {
    const url = getSupabaseUrl();
    const isLocalhost = url.includes('127.0.0.1') || url.includes('localhost');

    sharedClient = createClient(url, getSupabaseServiceKey(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        schema: 'public',
      },
      global: {
        fetch: createFetchWithTLS(isLocalhost) as typeof fetch,
      },
    });
  }
  return sharedClient;
}

export function getAnonSupabaseClient(): SupabaseClient {
  if (sharedAnonClient) {
    return sharedAnonClient;
  }

  const url = getSupabaseUrl();
  const isLocalhost = url.includes('127.0.0.1') || url.includes('localhost');

  sharedAnonClient = createClient(url, getSupabaseAnonKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: createFetchWithTLS(isLocalhost) as typeof fetch,
    },
  });

  return sharedAnonClient;
}

type RetryableError = Error & {
  message: string;
  cause?: { code?: string };
};

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const err = error as RetryableError;
  return (
    err.message.includes('fetch failed') ||
    err.message.includes('ECONNRESET') ||
    err.cause?.code === 'ECONNRESET'
  );
}

export function isRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const err = error as RetryableError;
  return (
    err.message.includes('rate limit') ||
    err.message.includes('timeout') ||
    err.message.includes('fetch failed') ||
    err.cause?.code === 'ECONNRESET'
  );
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = RETRY_CONFIG.maxRetries,
  initialDelay: number = RETRY_CONFIG.initialDelay
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries - 1 && isRetryableError(error)) {
        const delay = initialDelay * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error('Retry failed');
}

export function createTimeoutPromise<T>(ms: number, message: string): Promise<T> {
  return new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

let resetMutex: Promise<void> = Promise.resolve();

/**
 * Verify that database reset completed successfully by checking migrations were applied.
 * Checks that the users table exists (indicating migrations were applied).
 * Throws if the table is missing (PGRST116) or if other errors occur.
 */
async function verifyResetComplete(client: SupabaseClient): Promise<void> {
  const requestId = crypto.randomUUID();

  logger.debug(
    {
      requestId,
    },
    '[db] Verifying reset completion by checking users table'
  );

  // Check that migrations were applied by verifying schema exists
  const { error } = await client.from('users').select('id').limit(1);

  if (error) {
    // PGRST116 means "not found" - table doesn't exist, migrations not applied
    // This indicates a failed reset and should throw
    if (error.code === 'PGRST116') {
      logger.error(
        {
          requestId,
          errorCode: error.code,
          errorMessage: error.message,
        },
        '[db] Reset verification failed: users table not found'
      );
      throw new Error(
        `Database reset incomplete: users table not found after reset. ` +
          `Migrations may not have been applied. ` +
          `Check Supabase logs: bunx supabase logs`
      );
    }
    // Other errors might indicate connection issues
    logger.error(
      {
        requestId,
        errorCode: error.code,
        errorMessage: error.message,
      },
      '[db] Reset verification failed: connection error'
    );
    throw new Error(
      `Database reset incomplete: ${error.message}. ` +
        `Migrations may not have been applied. ` +
        `Check Supabase logs: bunx supabase logs`
    );
  }

  // If no error, table exists and reset is complete
  logger.debug(
    {
      requestId,
    },
    '[db] Reset verification successful: users table exists'
  );
}

export async function resetTestDb(): Promise<void> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  logger.info(
    {
      requestId,
      pid: process.pid,
    },
    '[db] Requesting database reset (waiting for mutex)'
  );

  const previousReset = resetMutex;
  let releaseMutex: () => void = () => {
    /* noop - will be replaced by promise resolve */
  };
  resetMutex = new Promise((resolve) => {
    releaseMutex = resolve;
  });

  const mutexWaitStart = Date.now();
  await previousReset;
  const mutexWaitDuration = Date.now() - mutexWaitStart;

  if (mutexWaitDuration > 100) {
    logger.warn(
      {
        requestId,
        mutexWaitDuration,
      },
      '[db] Waited for mutex (another reset was in progress)'
    );
  }

  logger.info(
    {
      requestId,
      mutexWaitDuration,
    },
    '[db] Acquired mutex, starting database reset'
  );

  try {
    // Reset shared client to force reconnection after database reset
    resetSharedClient();

    await execCommand(SUPABASE_RESET_COMMAND, 'reset Supabase database via supabase CLI');

    // Reset client again after reset completes to ensure fresh connection
    resetSharedClient();

    // Wait for database to be fully ready (PostgREST schema cache updated)
    // This is critical - seeding will fail if schema cache isn't ready
    logger.debug(
      {
        requestId,
      },
      '[db] Waiting for database and PostgREST schema cache to be ready'
    );
    const client = getTestSupabaseClient();

    // Wait for database readiness (local Supabase should be fast)
    // PostgREST schema cache updates are typically instant for local
    await waitForDatabaseReady(client, 10, 250); // 10 retries * 250ms = 2.5s max wait

    // Verify reset completed successfully (tables exist)
    logger.debug(
      {
        requestId,
      },
      '[db] Verifying reset completion'
    );
    await verifyResetComplete(client);

    // Seed with programmatic seeding (faster than SQL for tests)
    // seedTestData() will also wait for readiness, but we've already done it here
    await seedTestData();

    const totalDuration = Date.now() - startTime;
    logger.info(
      {
        requestId,
        totalDuration,
        mutexWaitDuration,
      },
      '[db] Database reset completed successfully'
    );
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    logger.error(
      {
        requestId,
        totalDuration,
        mutexWaitDuration,
        error: error instanceof Error ? error.message : String(error),
      },
      '[db] Database reset failed'
    );
    throw error;
  } finally {
    releaseMutex();
    logger.debug(
      {
        requestId,
      },
      '[db] Released mutex'
    );
  }
}

/**
 * Prepare test database with targeted cleanup (faster than full reset)
 * First test triggers full reset + seed, subsequent tests use cleanup
 * Uses file-based locking to prevent conflicts in parallel execution
 */
export async function prepareTestDb(): Promise<void> {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  logger.info({ requestId, pid: process.pid }, '[db] Preparing test database');

  // Fast path: Cleanup with TRUNCATE (no container restart)
  const releaseLock = await acquireDbLock(requestId, 10000);

  try {
    // Get fresh client - reset if there were previous connection issues
    resetSharedClient();
    const client = getTestSupabaseClient();

    // Use fast TRUNCATE cleanup
    await cleanupTestData(client);

    // Re-seed test data
    await seedTestData();

    const duration = Date.now() - startTime;
    logger.info({ requestId, duration }, '[db] Test database prepared (fast TRUNCATE path)');
  } finally {
    await releaseLock();
  }
}
