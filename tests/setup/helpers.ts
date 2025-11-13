/**
 * Test helper utilities for integration tests
 * Uses Supabase Auth for test user creation and authentication
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { User } from "../../ProjectSourceCode/src/lib/database/users.db.js";
import { AuthService } from "../../ProjectSourceCode/src/lib/services/auth.service.js";

// All tests use local Supabase by default (no rate limits, faster, isolated)
// Default local Supabase values (from `supabase start`, edit if needed)
// Use 127.0.0.1 to match what supabase status outputs (more reliable in WSL2)
const DEFAULT_LOCAL_URL = "http://127.0.0.1:54321";
const DEFAULT_LOCAL_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const DEFAULT_LOCAL_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

// Use local Supabase environment variables if set, otherwise use defaults
// This allows `supabase status -o env` to override defaults
const SUPABASE_URL =
  process.env.SUPABASE_LOCAL_URL ||
  process.env.SUPABASE_URL ||
  DEFAULT_LOCAL_URL;

// Support both new API key format (sb_secret_...) and legacy JWT format
// NOTE: Supabase JS client (v2.81.1) does not fully support new format for service role operations
// Prioritize JWT format for compatibility
const SUPABASE_SERVICE_KEY =
  process.env.SERVICE_ROLE_KEY || // JWT format from supabase status -o env (required for service role)
  process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SECRET_KEY || // New format from supabase status -o env (fallback, may not work for all operations)
  DEFAULT_LOCAL_SERVICE_KEY;

// Support both new API key format (sb_publishable_...) and legacy JWT format
const SUPABASE_ANON_KEY =
  process.env.PUBLISHABLE_KEY || // New format from supabase status -o env
  process.env.SUPABASE_LOCAL_ANON_KEY ||
  process.env.ANON_KEY || // Legacy format from supabase status -o env
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  DEFAULT_LOCAL_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error(
    "Missing Supabase test credentials: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required",
  );
}

/**
 * Get a Supabase client with service role key for test operations
 */
export function getTestSupabaseClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

/**
 * Retry helper with exponential backoff for network operations
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 100,
): Promise<T> {
  let lastError: Error | undefined;
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
 */
export async function resetTestDb(): Promise<void> {
  const client = getTestSupabaseClient();

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
    await retryWithBackoff(async () => {
      const { error } = await client
        .from(table)
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) {
        console.warn(`Failed to clear table ${table}:`, error.message);
      }
    }).catch((err) => {
      // Log but don't fail - table might already be empty
      console.warn(
        `Failed to clear table ${table} after retries:`,
        err.message,
      );
    });
  }

  // Clear auth users (requires service role)
  // Use pagination to handle large numbers of users
  let hasMore = true;
  let page = 0;
  const pageSize = 100;

  while (hasMore) {
    const result = await retryWithBackoff(async () => {
      return await client.auth.admin.listUsers({
        page,
        perPage: pageSize,
      });
    }).catch((err) => {
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

    // Delete users in parallel batches with retry
    const deletePromises = authUsers.users.map((authUser) =>
      retryWithBackoff(
        () => client.auth.admin.deleteUser(authUser.id),
        2, // Fewer retries for individual deletes
      ).catch((err) => {
        // Ignore errors during cleanup (user might already be deleted)
        if (!err.message?.includes("User not found")) {
          console.warn(
            `Failed to delete auth user ${authUser.id}:`,
            err.message,
          );
        }
      }),
    );

    await Promise.all(deletePromises);

    if (authUsers.users.length < pageSize) {
      // Check if there are more users
      hasMore = false;
    } else {
      page++;
    }
  }

  // Small delay to ensure cleanup completes
  await new Promise((resolve) => setTimeout(resolve, 100));
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

  // Check if user already exists
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
          2, // 2 retries with backoff for network errors
          200, // 200ms initial delay
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
      lastError = error as Error;
      // Retry on rate limiting, timeout, or persistent network errors
        retries--;
        if (retries > 0) {
          // Exponential backoff: 500ms, 1s, 2s (reduced from 1s, 2s, 4s)
          const delay = Math.pow(2, 3 - retries) * 500;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }
      throw error; // Re-throw if not rate limit, timeout, or network error
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
