import { spawn } from "node:child_process";
import crypto from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../../../ProjectSourceCode/src/server/lib/logger.js";
import { runSeed } from "../../../scripts/seed-db-snaplet";
import { cleanupTestData } from "./db-cleanup.js";
import { acquireDbLock } from "./db-lock.js";

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
  const url = process.env.SUPABASE_LOCAL_URL || process.env.SUPABASE_URL;
  if (!url) {
    throw new Error(
      "Missing SUPABASE_URL. Run 'bunx supabase status -o env' to load credentials.",
    );
  }
  return url;
}

function getSupabaseServiceKey(): string {
  const key =
    process.env.SERVICE_ROLE_KEY ||
    process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SECRET_KEY;
  if (!key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Run 'bunx supabase status -o env' to load credentials.",
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
    process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error(
      "Missing SUPABASE_ANON_KEY. Run 'bunx supabase status -o env' to load credentials.",
    );
  }
  return key;
}

// Lazy validation: validate only when functions are called, not at module load
// This ensures bun-setup.ts has time to load environment variables via preload

const SUPABASE_RESET_COMMAND =
  process.env.SUPABASE_RESET_COMMAND ??
  "bunx supabase db reset --local --yes --no-seed";

async function execCommand(
  command: string,
  label: string,
  timeoutMs = 15000, // 15 seconds should be plenty for local Supabase operations
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
    `[db] Starting: ${label}`,
  );

  return new Promise((resolve, reject) => {
    // Set AUTH_SITE_URL if not set (required by Supabase CLI)
    const env = {
      ...process.env,
      AUTH_SITE_URL:
        process.env.AUTH_SITE_URL ||
        process.env.SUPABASE_URL ||
        "http://localhost:54321",
    };

    // Use shell for commands to handle bunx package resolution properly
    const child = spawn(command, {
      stdio: "pipe",
      env,
      shell: true,
    });

    let stdout = "";
    let stderr = "";
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    logger.debug(
      {
        requestId,
        label,
        childPid: child.pid,
      },
      `[db] Spawned process for ${label}`,
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
        `[db] Timeout after ${timeoutMs}ms: ${label}`,
      );
      child.kill("SIGTERM");
      // Give it a moment, then force kill
      setTimeout(() => {
        if (!child.killed) {
          logger.warn(
            {
              requestId,
              label,
              childPid: child.pid,
            },
            `[db] Force killing process for ${label}`,
          );
          child.kill("SIGKILL");
        }
      }, 1000);
      reject(
        new Error(
          `Failed to ${label}: Command timed out after ${timeoutMs}ms\n` +
            `Suggestion: Check if Supabase is running: bunx supabase status\n` +
            `Output so far:\n${stdout}\n${stderr}`,
        ),
      );
    }, timeoutMs);

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
      // Log progress for long-running commands
      if (label.includes("reset")) {
        const lines = stdout.split("\n").filter(Boolean);
        const lastLine = lines[lines.length - 1];
        if (
          lastLine &&
          (lastLine.includes("Applying migration") ||
            lastLine.includes("Restarting containers") ||
            lastLine.includes("Finished"))
        ) {
          logger.info(
            {
              requestId,
              label,
              progress: lastLine,
            },
            `[db] ${lastLine}`,
          );
        }
      }
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
      logger.debug(
        {
          requestId,
          label,
          stderrChunk: data.toString().substring(0, 200),
        },
        `[db] stderr from ${label}`,
      );
    });

    child.on("error", (error) => {
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
        `[db] Failed: ${label} - ${error.message}`,
      );
      reject(
        new Error(`Failed to ${label}: ${error.message}\n${stdout}\n${stderr}`),
      );
    });

    child.on("close", (code) => {
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
          `[db] Completed: ${label}`,
        );
        resolve();
      } else {
        logger.error(
          {
            requestId,
            label,
            duration,
            exitCode: code ?? "null",
            stdoutLength: stdout.length,
            stderrLength: stderr.length,
            stdoutPreview: stdout.substring(0, 500),
            stderrPreview: stderr.substring(0, 500),
          },
          `[db] Failed: ${label} (code: ${code ?? "null"})`,
        );
        const details = [stdout, stderr].filter(Boolean).join("\n");
        const suggestion =
          code === null
            ? "Process was killed. Check if Supabase is running: bunx supabase status"
            : "Check Supabase logs: bunx supabase logs";

        reject(
          new Error(
            `Failed to ${label}: Command exited with code ${code ?? "null (process killed)"}\n` +
              `Suggestion: ${suggestion}\n` +
              `Details:\n${details}`,
          ),
        );
      }
    });
  });
}

/**
 * Wait for database to be ready after reset.
 * Queries the database to verify it's ready to accept connections and migrations are applied.
 */
async function waitForDatabaseReady(
  client: SupabaseClient,
  maxRetries = 20,
  delayMs = 250,
): Promise<void> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  logger.debug(
    {
      requestId,
      maxRetries,
      delayMs,
    },
    "[db] Waiting for database to be ready",
  );

  for (let i = 0; i < maxRetries; i++) {
    try {
      // Check if we can query the users table to verify:
      // 1. Database connection works
      // 2. Migrations are applied (table exists)
      const { error } = await client.from("users").select("id").limit(1);

      // If no error, table exists and migrations are applied - DB is ready
      if (!error) {
        const duration = Date.now() - startTime;
        logger.info(
          {
            requestId,
            attempt: i + 1,
            duration,
          },
          "[db] Database is ready",
        );
        return;
      }

      // PGRST116, PGRST301, or 404 means "not found" - table doesn't exist yet or schema cache not updated
      // Also check error message for schema cache issues
      const isNotFoundError =
        error.code === "PGRST116" ||
        error.code === "PGRST301" ||
        error.code === "404" ||
        error.message?.includes("schema cache");

      if (isNotFoundError) {
        if (i < maxRetries - 1) {
          logger.debug(
            {
              requestId,
              attempt: i + 1,
              errorCode: error.code,
              errorMessage: error.message,
              delayMs,
            },
            "[db] Table not found, retrying",
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
        // Exhausted retries, table still doesn't exist
        const duration = Date.now() - startTime;
        logger.error(
          {
            requestId,
            attempt: i + 1,
            duration,
            errorCode: error.code,
            errorMessage: error.message,
          },
          "[db] Database not ready: users table not found",
        );
        throw new Error(
          `Database not ready: users table not found after ${maxRetries * delayMs}ms. ` +
            `Migrations may not have been applied. Check Supabase is running: bunx supabase status`,
        );
      }

      // Other errors might indicate connection issues, retry
      if (i < maxRetries - 1) {
        logger.debug(
          {
            requestId,
            attempt: i + 1,
            errorCode: error.code,
            errorMessage: error.message,
            delayMs,
          },
          "[db] Database connection error, retrying",
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      // Exhausted retries with connection error
      const duration = Date.now() - startTime;
      logger.error(
        {
          requestId,
          attempt: i + 1,
          duration,
          errorCode: error.code,
          errorMessage: error.message,
        },
        "[db] Database connection error",
      );
      throw new Error(
        `Database connection error: ${error.message}. ` +
          `Check Supabase is running: bunx supabase status`,
      );
    } catch (err) {
      // Connection error or other exception, retry
      if (i < maxRetries - 1) {
        logger.debug(
          {
            requestId,
            attempt: i + 1,
            error: err instanceof Error ? err.message : String(err),
            delayMs,
          },
          "[db] Exception during readiness check, retrying",
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      // Exhausted retries
      const duration = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error(
        {
          requestId,
          attempt: i + 1,
          duration,
          error: errorMessage,
        },
        "[db] Database not ready after retries",
      );
      throw new Error(
        `Database not ready after ${maxRetries * delayMs}ms: ${errorMessage}. ` +
          `Check Supabase is running: bunx supabase status`,
      );
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
    "[db] Starting test data seeding",
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
      "[db] Running Snaplet seed",
    );
    await runSeed({ dryRun: false, skipReset: true });
    const duration = Date.now() - startTime;
    logger.info(
      {
        requestId,
        duration,
      },
      "[db] Test data seeding completed",
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const message =
      error instanceof Error
        ? error.message
        : `Unknown error: ${String(error)}`;
    logger.error(
      {
        requestId,
        duration,
        error: message,
      },
      "[db] Failed to seed test data",
    );
    throw new Error(`Failed to seed test data via Snaplet: ${message}`);
  }
}

let sharedClient: SupabaseClient | null = null;

export function resetSharedClient(): void {
  sharedClient = null;
}

function createFetchWithTLS(
  isLocalhost: boolean,
): (url: RequestInfo | URL, options?: RequestInit) => Promise<Response> {
  return (url: RequestInfo | URL, options?: RequestInit) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const existingSignal = options?.signal;
    let abortListener: (() => void) | null = null;

    if (existingSignal) {
      abortListener = () => controller.abort();
      existingSignal.addEventListener("abort", abortListener);
    }

    const fetchOptions: RequestInit = {
      ...options,
      signal: controller.signal,
    };

    if (options?.headers) {
      fetchOptions.headers = new Headers(options.headers as HeadersInit);
    }

    if (typeof Bun !== "undefined" && isLocalhost) {
      (fetchOptions as any).tls = {
        rejectUnauthorized: false,
      };
    }

    return fetch(url, fetchOptions).finally(() => {
      clearTimeout(timeoutId);
      if (existingSignal && abortListener) {
        existingSignal.removeEventListener("abort", abortListener);
      }
    });
  };
}

export function getTestSupabaseClient(): SupabaseClient {
  if (!sharedClient) {
    const url = getSupabaseUrl();
    const isLocalhost = url.includes("127.0.0.1") || url.includes("localhost");

    sharedClient = createClient(url, getSupabaseServiceKey(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        schema: "public",
      },
      global: {
        fetch: createFetchWithTLS(isLocalhost) as typeof fetch,
      },
    });
  }
  return sharedClient;
}

export function getAnonSupabaseClient(): SupabaseClient {
  const url = getSupabaseUrl();
  const isLocalhost = url.includes("127.0.0.1") || url.includes("localhost");

  return createClient(url, getSupabaseAnonKey(), {
    auth: { persistSession: false },
    global: {
      fetch: createFetchWithTLS(isLocalhost) as typeof fetch,
    },
  });
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
    err.message.includes("fetch failed") ||
    err.message.includes("ECONNRESET") ||
    err.cause?.code === "ECONNRESET"
  );
}

export function isRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const err = error as RetryableError;
  return (
    err.message.includes("rate limit") ||
    err.message.includes("timeout") ||
    err.message.includes("fetch failed") ||
    err.cause?.code === "ECONNRESET"
  );
}

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

      if (attempt < maxRetries - 1 && isRetryableError(error)) {
        const delay = initialDelay * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error("Retry failed");
}

export function createTimeoutPromise<T>(
  ms: number,
  message: string,
): Promise<T> {
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
    "[db] Verifying reset completion by checking users table",
  );

  // Check that migrations were applied by verifying schema exists
  const { error } = await client.from("users").select("id").limit(1);

  if (error) {
    // PGRST116 means "not found" - table doesn't exist, migrations not applied
    // This indicates a failed reset and should throw
    if (error.code === "PGRST116") {
      logger.error(
        {
          requestId,
          errorCode: error.code,
          errorMessage: error.message,
        },
        "[db] Reset verification failed: users table not found",
      );
      throw new Error(
        `Database reset incomplete: users table not found after reset. ` +
          `Migrations may not have been applied. ` +
          `Check Supabase logs: bunx supabase logs`,
      );
    }
    // Other errors might indicate connection issues
    logger.error(
      {
        requestId,
        errorCode: error.code,
        errorMessage: error.message,
      },
      "[db] Reset verification failed: connection error",
    );
    throw new Error(
      `Database reset incomplete: ${error.message}. ` +
        `Migrations may not have been applied. ` +
        `Check Supabase logs: bunx supabase logs`,
    );
  }

  // If no error, table exists and reset is complete
  logger.debug(
    {
      requestId,
    },
    "[db] Reset verification successful: users table exists",
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
    "[db] Requesting database reset (waiting for mutex)",
  );

  const previousReset = resetMutex;
  let releaseMutex: () => void = () => {};
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
      "[db] Waited for mutex (another reset was in progress)",
    );
  }

  logger.info(
    {
      requestId,
      mutexWaitDuration,
    },
    "[db] Acquired mutex, starting database reset",
  );

  try {
    // Reset shared client to force reconnection after database reset
    resetSharedClient();

    await execCommand(
      SUPABASE_RESET_COMMAND,
      "reset Supabase database via supabase CLI",
    );

    // Reset client again after reset completes to ensure fresh connection
    resetSharedClient();

    // Wait for database to be fully ready (PostgREST schema cache updated)
    // This is critical - seeding will fail if schema cache isn't ready
    logger.debug(
      {
        requestId,
      },
      "[db] Waiting for database and PostgREST schema cache to be ready",
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
      "[db] Verifying reset completion",
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
      "[db] Database reset completed successfully",
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
      "[db] Database reset failed",
    );
    throw error;
  } finally {
    releaseMutex();
    logger.debug(
      {
        requestId,
      },
      "[db] Released mutex",
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

  logger.info({ requestId, pid: process.pid }, "[db] Preparing test database");

  // Fast path: Cleanup with TRUNCATE (no container restart)
  const releaseLock = await acquireDbLock(requestId, 10000);

  try {
    const client = getTestSupabaseClient();

    // Use fast TRUNCATE cleanup
    await cleanupTestData(client);

    // Re-seed test data
    await seedTestData();

    const duration = Date.now() - startTime;
    logger.info(
      { requestId, duration },
      "[db] Test database prepared (fast TRUNCATE path)",
    );
  } finally {
    await releaseLock();
  }
}
