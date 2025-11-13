/**
 * Test helper utilities for integration tests
 * Uses Supabase Auth for test user creation and authentication
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { User } from "../../ProjectSourceCode/src/lib/database/users.db.js";
import { DuplicateUserError } from "../../ProjectSourceCode/src/lib/errors/app.errors.js";
import { AuthService } from "../../ProjectSourceCode/src/lib/services/auth.service.js";

// All tests use local Supabase (no rate limits, faster, isolated)
// Credentials must be loaded from `supabase status -o env` via vitest-setup.ts
// No hardcoded defaults - all values must come from CLI output
const SUPABASE_URL =
  process.env.SUPABASE_LOCAL_URL ||
  process.env.SUPABASE_URL;

// Support both new API key format (sb_secret_...) and legacy JWT format
// NOTE: Supabase JS client (v2.81.1) does not fully support new format for service role operations
// Prioritize JWT format for compatibility
const SUPABASE_SERVICE_KEY =
  process.env.SERVICE_ROLE_KEY || // JWT format from supabase status -o env (required for service role)
  process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SECRET_KEY; // New format from supabase status -o env (fallback, may not work for all operations)

// Support both new API key format (sb_publishable_...) and legacy JWT format
const SUPABASE_ANON_KEY =
  process.env.PUBLISHABLE_KEY || // New format from supabase status -o env
  process.env.SUPABASE_LOCAL_ANON_KEY ||
  process.env.ANON_KEY || // Legacy format from supabase status -o env
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error(
    "Missing Supabase test credentials: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required",
  );
}

/**
 * Get a Supabase client with service role key for test operations
 * Configured for test stability with connection management
 */
export function getTestSupabaseClient(): SupabaseClient {
  // Runtime checks to satisfy TypeScript (values already validated at module load)
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error(
      "Missing Supabase test credentials: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required",
    );
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: "public",
    },
    global: {
      // Add fetch timeout to prevent hanging connections
      fetch: ((url: RequestInfo | URL, options?: RequestInit) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        // Merge signals if one already exists
        const existingSignal = options?.signal;
        const signal = existingSignal
          ? (() => {
              const merged = new AbortController();
              existingSignal.addEventListener("abort", () => merged.abort());
              controller.signal.addEventListener("abort", () => merged.abort());
              return merged.signal;
            })()
          : controller.signal;

        return fetch(url, {
          ...options,
          signal,
        }).finally(() => {
          clearTimeout(timeoutId);
        });
      }) as typeof fetch,
    },
  });
}

/**
 * Mutex to prevent concurrent database resets
 * Even with fileParallelism disabled, this provides extra safety
 */
let resetMutex: Promise<void> = Promise.resolve();

/**
 * Certify connection to Supabase before operations
 * Verifies connectivity and retries if needed
 * Returns true if connection is certified, false if connection issues detected
 */
async function certifyConnection(
  client: ReturnType<typeof getTestSupabaseClient>,
  maxRetries = 5,
): Promise<boolean> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Simple query to verify connection
      const { error } = await client.from("users").select("id").limit(1);
      if (!error) {
        return true; // Connection certified
      }
      // Check if it's a connection error vs business logic error
      if (
        error.message.includes("fetch failed") ||
        error.message.includes("ECONNRESET")
      ) {
        lastError = new Error(`Connection error: ${error.message}`);
      } else {
        // Business logic error (e.g., RLS policy) - connection is working
        return true;
      }
    } catch (error) {
      const err = error as Error;
      if (
        err.message.includes("fetch failed") ||
        err.message.includes("ECONNRESET") ||
        (err.cause &&
          typeof err.cause === "object" &&
          "code" in err.cause &&
          err.cause.code === "ECONNRESET")
      ) {
        lastError = err;
      } else {
        // Other errors - connection might be working, just retry
        lastError = err;
      }
    }

    // Retry with exponential backoff
    if (attempt < maxRetries - 1) {
      const delay = 300 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Connection failed after retries - log warning but don't throw
  // The actual operation will fail with a clearer error
  console.warn(
    `⚠️  Connection certification failed after ${maxRetries} attempts: ${lastError?.message}`,
  );
  return false;
}

/**
 * Retry helper with exponential backoff for network operations
 * Includes connection certification before first attempt
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 100,
  certifyFirst = false,
): Promise<T> {
  let lastError: Error | undefined;

  // Certify connection before first attempt if requested
  if (certifyFirst) {
    const certified = await certifyConnection(getTestSupabaseClient());
    if (!certified) {
      // Connection not certified, but proceed anyway - operation will fail with clearer error
      // This prevents blocking tests when Supabase is temporarily unavailable
    }
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      // Only retry on network errors (ECONNRESET, fetch failed)
      if (
        attempt < maxRetries - 1 &&
        error instanceof Error &&
        (error.message.includes("fetch failed") ||
          error.message.includes("ECONNRESET") ||
          (error.cause &&
            typeof error.cause === "object" &&
            "code" in error.cause &&
            error.cause.code === "ECONNRESET"))
      ) {
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error("Retry failed");
}

/**
 * Reset test database by clearing all tables
 * Also clears Supabase Auth users
 * Includes retry logic for network connection issues
 * Uses mutex to prevent concurrent resets
 */
export async function resetTestDb(): Promise<void> {
  // Wait for any ongoing reset to complete, then acquire the mutex
  const previousReset = resetMutex;
  let releaseMutex: () => void;
  resetMutex = new Promise((resolve) => {
    releaseMutex = resolve;
  });

  // Wait for previous reset to complete
  await previousReset;

  // Add recovery delay to let Supabase stabilize after previous reset
  // Longer delay to ensure connection pool recovers
  await new Promise((resolve) => setTimeout(resolve, 1000));

  try {
    const client = getTestSupabaseClient();

    // Certify connection before starting reset (non-blocking)
    const certified = await certifyConnection(client);
    if (!certified) {
      console.warn(
        "⚠️  Connection not certified before reset - proceeding anyway (will retry on failure)",
      );
    }

    // Clear tables in reverse dependency order first (faster)
    const tables = [
      "points_history",
      "tasks",
      "lists",
      "boards",
      "users",
      "teams",
    ];

    for (const table of tables) {
      await retryWithBackoff(
        async () => {
          const { error } = await client
            .from(table)
            .delete()
            .neq("id", "00000000-0000-0000-0000-000000000000");
          if (error) {
            console.warn(`Failed to clear table ${table}:`, error.message);
          }
        },
        5, // More retries for table operations
        300, // Longer initial delay
      ).catch((err) => {
        // Log but don't fail - table might already be empty
        console.warn(
          `Failed to clear table ${table} after retries:`,
          err.message,
        );
      });
      // Longer delay between table clears to prevent overwhelming Supabase
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Clear auth users (requires service role)
    // Use pagination to handle large numbers of users
    let hasMore = true;
    let page = 0;
    const pageSize = 50; // Smaller page size to reduce load

    while (hasMore) {
      const result = await retryWithBackoff(
        async () => {
          return await client.auth.admin.listUsers({
            page,
            perPage: pageSize,
          });
        },
        5, // More retries
        300, // Longer initial delay
      ).catch((err) => {
        console.warn("Failed to list auth users after retries:", err.message);
        return { data: null, error: err };
      });

      const { data: authUsers, error } = result;

      if (error) {
        console.warn("Failed to list auth users:", error.message);
        break;
      }

      if (!authUsers?.users || authUsers.users.length === 0) {
        hasMore = false;
        break;
      }

      // Delete users sequentially to prevent overwhelming Supabase
      for (const authUser of authUsers.users) {
        await retryWithBackoff(
          () => client.auth.admin.deleteUser(authUser.id),
          3, // More retries for individual deletes
          200, // Longer initial delay
        ).catch((err) => {
          // Ignore errors during cleanup (user might already be deleted)
          if (!err.message?.includes("User not found")) {
            console.warn(
              `Failed to delete auth user ${authUser.id}:`,
              err.message,
            );
          }
        });
        // Longer delay between user deletions
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      if (authUsers.users.length < pageSize) {
        // Check if there are more users
        hasMore = false;
      } else {
        page++;
        // Delay between pages
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // Longer delay to ensure cleanup completes and Supabase recovers
    // This helps prevent connection pool exhaustion
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } finally {
    // Release the mutex
    releaseMutex!();
  }
}

/**
 * Create a test user using Supabase Auth
 * Returns user data and credentials
 * Handles rate limiting with retries
 */
export async function createTestUser(
  email: string,
  password: string,
  role: User["role"] = "member",
  displayName?: string,
): Promise<{ user: User; email: string; password: string }> {
  const client = getTestSupabaseClient();
  const authService = new AuthService(client);

  // Check if user already exists in public.users table
  const { data: existingUser } = await client
    .from("users")
    .select("id, email")
    .eq("email", email)
    .single();

  if (existingUser) {
    // User exists, return it
    const { data: userData } = await client
      .from("users")
      .select("*")
      .eq("id", existingUser.id)
      .single();

    if (userData) {
      return {
        user: userData as User,
        email,
        password,
      };
    }
  }

  // Also check Supabase Auth (user might exist in auth but not in public.users)
  // This will be caught below if registration fails with DuplicateUserError

  // Retry logic for rate limiting and network errors
  // Add timeout to prevent hanging (3 seconds max per attempt)
  const REGISTER_TIMEOUT = 3000;
  let retries = 3;
  let lastError: Error | null = null;
  let registerResult: { user: Omit<User, "password_hash"> } | null = null;

  while (retries > 0) {
    try {
      // Use retryWithBackoff for network errors, then outer retry for rate limiting
      // Wrap in Promise.race to add timeout
      const result = await Promise.race([
        retryWithBackoff(
          () =>
            authService.register({
              email,
              password,
              display_name: displayName ?? email.split("@")[0] ?? "Test User",
              role,
            }),
          3, // 3 retries with backoff for network errors
          300, // 300ms initial delay
          true, // Certify connection first
        ),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Register timeout after 3 seconds")),
            REGISTER_TIMEOUT,
          ),
        ),
      ]);
      registerResult = result;
      break; // Success
    } catch (error) {
      // If user already exists, try to fetch from database and verify login works
      if (DuplicateUserError.isDuplicateUserError(error)) {
        // User exists in auth, try to get from public.users table
        const { data: userData } = await client
          .from("users")
          .select("*")
          .eq("email", email)
          .single();

        if (userData) {
          // Verify the user can actually log in (password might be wrong)
          try {
            const testLogin = await authService.login({ email, password });
            if (testLogin.user) {
              return {
                user: userData as User,
                email,
                password,
              };
            }
          } catch (loginError) {
            // Password might be wrong, delete and recreate
            console.warn(
              `User ${email} exists but password doesn't match, recreating...`,
            );
            // Delete auth user and retry registration
            try {
              const serviceClient = getTestSupabaseClient();
              const { data: authUsers } = await serviceClient.auth.admin.listUsers();
              const authUser = authUsers?.users.find((u) => u.email === email);
              if (authUser) {
                await serviceClient.auth.admin.deleteUser(authUser.id);
              }
              // Also delete from public.users
              await client.from("users").delete().eq("email", email);
            } catch (deleteError) {
              // Ignore delete errors
            }
            // Retry registration
            if (retries > 0) {
              retries--;
              await new Promise((resolve) => setTimeout(resolve, 200));
              continue;
            }
          }
        }
        // If not in public.users, wait a bit and retry (might be syncing)
        if (retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          retries--;
          continue;
        }
      }

      lastError = error as Error;
      // Retry on rate limiting, timeout, or persistent network errors
      retries--;
      if (retries > 0) {
        // Exponential backoff: 500ms, 1s, 2s (reduced from 1s, 2s, 4s)
        const delay = Math.pow(2, 3 - retries) * 500;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      // If no retries left, break and let lastError be thrown below
      break;
    }
  }

  if (lastError) {
    throw lastError;
  }

  // If register returned the user, use it directly (faster and more reliable)
  // Note: registerResult.user is Omit<User, "password_hash">, but User type requires it
  // We'll add password_hash: "" to satisfy the type (not used with Supabase Auth)
  if (registerResult?.user) {
    return {
      user: { ...registerResult.user, password_hash: "" } as User,
      email,
      password,
    };
  }

  // Fallback: Get full user from database with retry (handles network errors and sync delays)
  let data = null;
  for (let i = 0; i < 5; i++) {
    try {
      const result = await retryWithBackoff(
        async () => {
          const queryResult = await client
            .from("users")
            .select("*")
            .eq("email", email)
            .single();
          return queryResult;
        },
        2, // 2 retries with backoff for network errors
        200, // 200ms initial delay
      );

      if (result.data) {
        data = result.data;
        break;
      }

      // Wait a bit for database to sync (if no data but no error)
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      // On last attempt, throw the error
      if (i === 4) {
        throw new Error(
          `Failed to retrieve created user ${email} after retries: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  if (!data) {
    throw new Error(`Failed to retrieve created user: ${email}`);
  }

  return {
    user: data as User,
    email,
    password,
  };
}

/**
 * Login as admin and return session tokens for cookie setting
 */
export async function loginAsAdmin(): Promise<{
  access_token: string;
  refresh_token: string;
}> {
  const client = getTestSupabaseClient();
  const authService = new AuthService(client);

  // Create admin user if it doesn't exist
  const adminEmail = "admin@test.com";
  const adminPassword = "testpassword123";

  try {
    const { data: existing } = await client
      .from("users")
      .select("*")
      .eq("email", adminEmail)
      .single();

    if (!existing) {
      await createTestUser(adminEmail, adminPassword, "admin", "Test Admin");
    }
  } catch {
    await createTestUser(adminEmail, adminPassword, "admin", "Test Admin");
  }

  const result = await authService.login({
    email: adminEmail,
    password: adminPassword,
  });

  if (!result.session) {
    throw new Error("Failed to get session from login");
  }

  return result.session;
}

/**
 * Login as a regular user and return session tokens
 */
export async function loginAsUser(
  email: string,
  password: string,
): Promise<{ access_token: string; refresh_token: string }> {
  const client = getTestSupabaseClient();
  const authService = new AuthService(client);

  const result = await authService.login({ email, password });

  if (!result.session) {
    throw new Error("Failed to get session from login");
  }

  return result.session;
}
