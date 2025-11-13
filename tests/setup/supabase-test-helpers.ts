/**
 * Supabase test helpers for integration tests
 *
 * Provides utilities for:
 * - Supabase client configuration (local development)
 * - Database reset and cleanup
 * - Test user creation and authentication
 * - Retry logic for network operations
 *
 * All operations use local Supabase by default for faster, isolated tests.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { User } from "../../ProjectSourceCode/src/lib/database/users.db.js";
import { AuthService } from "../../ProjectSourceCode/src/lib/services/auth.service.js";

// ============================================================================
// Configuration
// ============================================================================

// All credentials must be loaded from `supabase status -o env` via vitest-setup.ts
// No hardcoded defaults - all values must come from CLI output

/**
 * Test database table names in reverse dependency order
 * (for efficient cleanup)
 */
const TEST_TABLES = [
  "points_history",
  "tasks",
  "lists",
  "boards",
  "users",
  "teams",
] as const;

/**
 * Retry configuration constants
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 100,
  registerTimeout: 3000,
  userSyncRetries: 5,
  userSyncDelay: 200,
  cleanupDelay: 100,
} as const;

/**
 * Auth user pagination settings
 */
const AUTH_PAGINATION = {
  pageSize: 100,
  deleteRetries: 2,
} as const;

// ============================================================================
// Configuration Resolution
// ============================================================================

/**
 * Resolves Supabase URL from environment variables
 * Must be loaded from `supabase status -o env` via vitest-setup.ts
 */
function getSupabaseUrl(): string {
  const url = process.env.SUPABASE_LOCAL_URL || process.env.SUPABASE_URL;
  if (!url) {
    throw new Error(
      "Missing SUPABASE_URL. Ensure Supabase is running and run 'supabase status -o env' to load credentials.",
    );
  }
  return url;
}

/**
 * Resolves Supabase service role key from environment variables
 * Must be loaded from `supabase status -o env` via vitest-setup.ts
 *
 * NOTE: Supabase JS client (v2.81.1) does not fully support new API key format
 * for service role operations. Prioritizes JWT format for compatibility.
 */
function getSupabaseServiceKey(): string {
  const key =
    process.env.SERVICE_ROLE_KEY || // JWT format (preferred)
    process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SECRET_KEY; // New format (fallback)
  if (!key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Ensure Supabase is running and run 'supabase status -o env' to load credentials.",
    );
  }
  return key;
}

/**
 * Resolves Supabase anon key from environment variables
 * Must be loaded from `supabase status -o env` via vitest-setup.ts
 */
function getSupabaseAnonKey(): string {
  const key =
    process.env.PUBLISHABLE_KEY || // New format
    process.env.SUPABASE_LOCAL_ANON_KEY ||
    process.env.ANON_KEY || // Legacy format
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error(
      "Missing SUPABASE_ANON_KEY. Ensure Supabase is running and run 'supabase status -o env' to load credentials.",
    );
  }
  return key;
}

/**
 * Validates that required Supabase credentials are available
 */
function validateCredentials(): void {
  const url = getSupabaseUrl();
  const serviceKey = getSupabaseServiceKey();

  if (!url || !serviceKey) {
    throw new Error(
      "Missing Supabase test credentials: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required",
    );
  }
}

// Initialize validation on module load
validateCredentials();

// ============================================================================
// Supabase Client
// ============================================================================

/**
 * Creates a Supabase client with service role key for test operations
 *
 * @returns Configured Supabase client with service role permissions
 */
export function getTestSupabaseClient(): SupabaseClient {
  return createClient(getSupabaseUrl(), getSupabaseServiceKey(), {
    auth: { persistSession: false },
  });
}

/**
 * Creates a Supabase client using the anon/publishable key
 * Used for verifying end-user authentication flows
 */
function getAnonSupabaseClient(): SupabaseClient {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: { persistSession: false },
  });
}

// ============================================================================
// Retry Utilities
// ============================================================================

/**
 * Error types that should trigger retries
 */
type RetryableError = Error & {
  message: string;
  cause?: { code?: string };
};

/**
 * Checks if an error is retryable (network-related)
 */
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

/**
 * Checks if an error is rate-limit related
 */
function isRateLimitError(error: unknown): boolean {
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

/**
 * Retries an async operation with exponential backoff
 *
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retry attempts
 * @param initialDelay - Initial delay in milliseconds
 * @returns Result of the function
 * @throws Last error if all retries fail
 */
async function retryWithBackoff<T>(
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

      // Only retry on network errors
      if (attempt < maxRetries - 1 && isRetryableError(error)) {
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
 * Creates a timeout promise that rejects after specified milliseconds
 */
function createTimeoutPromise<T>(ms: number, message: string): Promise<T> {
  return new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

// ============================================================================
// Database Cleanup
// ============================================================================

/**
 * Clears all data from a single table
 */
async function clearTable(
  client: SupabaseClient,
  table: string,
): Promise<void> {
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
    console.warn(`Failed to clear table ${table} after retries:`, err.message);
  });
}

/**
 * Clears all Supabase Auth users using pagination
 */
async function clearAuthUsers(client: SupabaseClient): Promise<void> {
  let hasMore = true;
  let page = 0;

  while (hasMore) {
    const result = await retryWithBackoff(async () => {
      return await client.auth.admin.listUsers({
        page,
        perPage: AUTH_PAGINATION.pageSize,
      });
    }).catch((err) => {
      console.warn("Failed to list auth users after retries:", err.message);
      return { data: null, error: err };
    });

    const { data: authUsers, error } = result;

    if (error || !authUsers?.users || authUsers.users.length === 0) {
      hasMore = false;
      if (error) {
        console.warn("Failed to list auth users:", error.message);
      }
      break;
    }

    // Delete users in parallel batches
    const deletePromises = authUsers.users.map((authUser) =>
      retryWithBackoff(
        () => client.auth.admin.deleteUser(authUser.id),
        AUTH_PAGINATION.deleteRetries,
      ).catch((err) => {
        // Ignore "User not found" errors
        if (!err.message?.includes("User not found")) {
          console.warn(
            `Failed to delete auth user ${authUser.id}:`,
            err.message,
          );
        }
      }),
    );

    await Promise.all(deletePromises);

    // Check if there are more users
    hasMore = authUsers.users.length >= AUTH_PAGINATION.pageSize;
    if (hasMore) {
      page++;
    }
  }
}

/**
 * Resets the test database by clearing all tables and auth users
 *
 * Clears data in reverse dependency order for efficiency.
 * Includes retry logic for network connection issues.
 */
export async function resetTestDb(): Promise<void> {
  const client = getTestSupabaseClient();

  // Clear tables in reverse dependency order
  for (const table of TEST_TABLES) {
    await clearTable(client, table);
  }

  // Clear auth users
  await clearAuthUsers(client);

  // Small delay to ensure cleanup completes
  await new Promise((resolve) =>
    setTimeout(resolve, RETRY_CONFIG.cleanupDelay),
  );
}

// ============================================================================
// User Creation
// ============================================================================

/**
 * Result type for test user creation
 */
export type TestUser = {
  user: User;
  email: string;
  password: string;
};

/**
 * Checks if a user already exists in the database
 */
async function findExistingUser(
  client: SupabaseClient,
  email: string,
): Promise<User | null> {
  const { data: existingUser } = await client
    .from("users")
    .select("id, email")
    .eq("email", email)
    .single();

  if (!existingUser) {
    return null;
  }

  const { data: userData } = await client
    .from("users")
    .select("*")
    .eq("id", existingUser.id)
    .single();

  return userData ? (userData as User) : null;
}

/**
 * Registers a new user with retry logic for rate limiting and network errors
 */
async function registerUserWithRetry(
  authService: AuthService,
  email: string,
  password: string,
  displayName: string,
  role: User["role"],
): Promise<{ user: Omit<User, "password_hash"> } | null> {
  let retries = RETRY_CONFIG.maxRetries;
  let lastError: Error | null = null;

  while (retries > 0) {
    try {
      const result = (await Promise.race([
        retryWithBackoff(
          () =>
            authService.register({
              email,
              password,
              display_name: displayName,
              role,
            }),
          2, // 2 retries with backoff for network errors
          RETRY_CONFIG.initialDelay * 2,
        ),
        createTimeoutPromise(
          RETRY_CONFIG.registerTimeout,
          "Register timeout after 3 seconds",
        ),
      ])) as { user: Omit<User, "password_hash"> } | null;

      return result;
    } catch (error) {
      lastError = error as Error;

      // Retry on rate limiting, timeout, or network errors
      if (isRateLimitError(error)) {
        retries--;
        if (retries > 0) {
          // Exponential backoff: 500ms, 1s, 2s
          const delay = Math.pow(2, RETRY_CONFIG.maxRetries - retries) * 500;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      // Re-throw if not retryable
      throw error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  return null;
}

/**
 * Retrieves a user from the database with retry logic for sync delays
 */
async function retrieveUserWithRetry(
  client: SupabaseClient,
  email: string,
): Promise<User> {
  for (let i = 0; i < RETRY_CONFIG.userSyncRetries; i++) {
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
        RETRY_CONFIG.initialDelay * 2,
      );

      if (result.data) {
        return result.data as User;
      }

      // Wait for database sync
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_CONFIG.userSyncDelay),
      );
    } catch (error) {
      // On last attempt, throw the error
      if (i === RETRY_CONFIG.userSyncRetries - 1) {
        throw new Error(
          `Failed to retrieve created user ${email} after retries: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }

      // Wait before retrying
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_CONFIG.userSyncDelay),
      );
    }
  }

  throw new Error(`Failed to retrieve created user: ${email}`);
}

/**
 * Creates a test user using Supabase Auth
 *
 * Returns existing user if already present, otherwise creates a new one.
 * Handles rate limiting and network errors with retry logic.
 *
 * @param email - User email address
 * @param password - User password
 * @param role - User role (default: "member")
 * @param displayName - Optional display name (defaults to email prefix)
 * @returns Test user data and credentials
 */
export async function createTestUser(
  email: string,
  password: string,
  role: User["role"] = "member",
  displayName?: string,
): Promise<TestUser> {
  const client = getTestSupabaseClient();
  const authClient = getAnonSupabaseClient();
  const authService = new AuthService(authClient);

  // Check if user already exists
  const existingUser = await findExistingUser(client, email);
  if (existingUser) {
    const anonClient = getAnonSupabaseClient();
    const loginAttempt = await anonClient.auth.signInWithPassword({
      email,
      password,
    });

    if (!loginAttempt.error) {
      // Ensure no lingering session
      await anonClient.auth.signOut().catch(() => {});
      return {
        user: existingUser,
        email,
        password,
      };
    }

    // Password mismatch or auth inconsistency - remove and recreate
    await retryWithBackoff(
      async () => {
        await client.auth.admin.deleteUser(existingUser.id);
      },
      2,
      RETRY_CONFIG.initialDelay,
    ).catch((error) => {
      console.warn(
        `Failed to delete auth user ${existingUser.id}:`,
        (error as Error).message,
      );
    });

    await retryWithBackoff(
      async () => {
        await client.from("users").delete().eq("id", existingUser.id);
      },
      2,
      RETRY_CONFIG.initialDelay,
    ).catch((error) => {
      console.warn(
        `Failed to delete user profile ${existingUser.id}:`,
        (error as Error).message,
      );
    });
  }

  // Register new user with retry logic
  const displayNameValue = displayName ?? email.split("@")[0] ?? "Test User";
  const registerResult = await registerUserWithRetry(
    authService,
    email,
    password,
    displayNameValue,
    role,
  );

  // If register returned the user, use it directly (faster)
  if (registerResult?.user) {
    return {
      user: { ...registerResult.user, password_hash: "" } as User,
      email,
      password,
    };
  }

  // Fallback: Retrieve user from database with retry
  const user = await retrieveUserWithRetry(client, email);

  return {
    user,
    email,
    password,
  };
}

// ============================================================================
// Authentication Helpers
// ============================================================================

/**
 * Session tokens for authenticated requests
 */
export type SessionTokens = {
  access_token: string;
  refresh_token: string;
};

/**
 * Default admin credentials for testing
 */
const ADMIN_CREDENTIALS = {
  email: "admin@test.com",
  password: "testpassword123",
  displayName: "Test Admin",
} as const;

/**
 * Ensures admin user exists, creating it if necessary
 */
async function ensureAdminUser(): Promise<void> {
  const client = getTestSupabaseClient();

  try {
    const { data: existing } = await client
      .from("users")
      .select("*")
      .eq("email", ADMIN_CREDENTIALS.email)
      .single();

    if (!existing) {
      await createTestUser(
        ADMIN_CREDENTIALS.email,
        ADMIN_CREDENTIALS.password,
        "admin",
        ADMIN_CREDENTIALS.displayName,
      );
    }
  } catch {
    // User doesn't exist, create it
    await createTestUser(
      ADMIN_CREDENTIALS.email,
      ADMIN_CREDENTIALS.password,
      "admin",
      ADMIN_CREDENTIALS.displayName,
    );
  }
}

/**
 * Logs in a user and returns session tokens
 */
async function loginUser(
  authService: AuthService,
  email: string,
  password: string,
): Promise<SessionTokens> {
  const result = await authService.login({ email, password });

  if (!result.session) {
    throw new Error("Failed to get session from login");
  }

  return result.session;
}

/**
 * Logs in as admin and returns session tokens
 *
 * Creates admin user if it doesn't exist.
 */
export async function loginAsAdmin(): Promise<SessionTokens> {
  const authClient = getAnonSupabaseClient();
  const authService = new AuthService(authClient);

  await ensureAdminUser();

  return loginUser(
    authService,
    ADMIN_CREDENTIALS.email,
    ADMIN_CREDENTIALS.password,
  );
}

/**
 * Logs in as a regular user and returns session tokens
 *
 * @param email - User email address
 * @param password - User password
 * @returns Session tokens for authenticated requests
 */
export async function loginAsUser(
  email: string,
  password: string,
): Promise<SessionTokens> {
  const authClient = getAnonSupabaseClient();
  const authService = new AuthService(authClient);

  return loginUser(authService, email, password);
}
