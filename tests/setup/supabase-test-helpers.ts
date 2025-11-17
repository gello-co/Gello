/**
 * Unified Supabase test helpers for integration tests
 *
 * Provides utilities for:
 * - Supabase client configuration (local development with HTTPS support)
 * - Database reset and cleanup (with mutex for parallel test safety)
 * - Test user creation and authentication
 * - Retry logic for network operations
 * - CSRF token handling for authenticated requests
 *
 * All operations use local Supabase by default for faster, isolated tests.
 * Environment variables are loaded by vitest-setup.ts from 'supabase status -o env'.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { User } from "../../ProjectSourceCode/src/lib/database/users.db.js";
import { DuplicateUserError } from "../../ProjectSourceCode/src/lib/errors/app.errors.js";
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
  pageSize: 50, // Smaller page size to reduce load
  deleteRetries: 3,
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
 * Shared Supabase client pool for test operations
 * Reuses clients to prevent connection pool exhaustion during parallel test execution
 * Clients are stateless and safe to reuse across tests
 */
let sharedClient: SupabaseClient | null = null;

/**
 * Creates a fetch wrapper with timeout and TLS configuration for local HTTPS
 */
function createFetchWithTLS(
  isLocalhost: boolean,
): (url: RequestInfo | URL, options?: RequestInit) => Promise<Response> {
  return (url: RequestInfo | URL, options?: RequestInit) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    // If an existing signal exists, listen to it and abort our controller when it aborts
    // This ensures both timeout and existing signal trigger the same controller
    const existingSignal = options?.signal;
    let abortListener: (() => void) | null = null;

    if (existingSignal) {
      abortListener = () => controller.abort();
      existingSignal.addEventListener("abort", abortListener);
    }

    // Configure fetch options for local HTTPS with self-signed certificates
    const fetchOptions: RequestInit = {
      ...options,
      signal: controller.signal,
    };

    // Bun-specific: Configure TLS to accept self-signed certificates for localhost
    if (isLocalhost && typeof Bun !== "undefined") {
      (fetchOptions as any).tls = {
        rejectUnauthorized: false,
      };
    }

    return fetch(url, fetchOptions).finally(() => {
      clearTimeout(timeoutId);
      // Remove listener if it was attached
      if (existingSignal && abortListener) {
        existingSignal.removeEventListener("abort", abortListener);
      }
    });
  };
}

/**
 * Creates a Supabase client with service role key for test operations
 * Uses a shared singleton client to prevent connection pool exhaustion
 *
 * @returns Configured Supabase client with service role permissions
 */
export function getTestSupabaseClient(): SupabaseClient {
  // Reuse shared client to prevent connection pool exhaustion
  // Supabase JS client is stateless and safe to reuse
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
        // Configure fetch with timeout and TLS for self-signed certificates
        fetch: createFetchWithTLS(isLocalhost) as typeof fetch,
      },
    });
  }
  return sharedClient;
}

/**
 * Creates a Supabase client using the anon/publishable key
 * Used for verifying end-user authentication flows
 */
function getAnonSupabaseClient(): SupabaseClient {
  const url = getSupabaseUrl();
  const isLocalhost = url.includes("127.0.0.1") || url.includes("localhost");

  return createClient(url, getSupabaseAnonKey(), {
    auth: { persistSession: false },
    global: {
      // Configure fetch to accept self-signed certificates for local HTTPS
      fetch: createFetchWithTLS(isLocalhost) as typeof fetch,
    },
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
 * Retries an async operation with exponential backoff
 *
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retry attempts
 * @param initialDelay - Initial delay in milliseconds
 * @param certifyFirst - Whether to certify connection before first attempt
 * @returns Result of the function
 * @throws Last error if all retries fail
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = RETRY_CONFIG.maxRetries,
  initialDelay: number = RETRY_CONFIG.initialDelay,
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
 * Mutex to prevent concurrent database resets
 * Provides safety when multiple test files run in parallel
 */
let resetMutex: Promise<void> = Promise.resolve();

/**
 * Clears all data from a single table
 */
async function clearTable(
  client: SupabaseClient,
  table: string,
): Promise<void> {
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
    const result = await retryWithBackoff(
      async () => {
        return await client.auth.admin.listUsers({
          page,
          perPage: AUTH_PAGINATION.pageSize,
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
        AUTH_PAGINATION.deleteRetries, // More retries for individual deletes
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
      // Delay between user deletions
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    if (authUsers.users.length < AUTH_PAGINATION.pageSize) {
      // Check if there are more users
      hasMore = false;
    } else {
      page++;
      // Delay between pages
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

/**
 * Resets the test database by clearing all tables and auth users
 *
 * Clears data in reverse dependency order for efficiency.
 * Includes retry logic for network connection issues.
 * Uses mutex to prevent concurrent resets when tests run in parallel.
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

    // Clear tables in reverse dependency order
    for (const table of TEST_TABLES) {
      await clearTable(client, table);
      // Delay between table clears to prevent overwhelming Supabase
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Clear auth users
    await clearAuthUsers(client);

    // Longer delay to ensure cleanup completes and Supabase recovers
    // This helps prevent connection pool exhaustion
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } finally {
    // Release the mutex
    releaseMutex!();
  }
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
          3, // 3 retries with backoff for network errors
          300, // 300ms initial delay
          true, // Certify connection first
        ),
        createTimeoutPromise(
          RETRY_CONFIG.registerTimeout,
          "Register timeout after 3 seconds",
        ),
      ])) as { user: Omit<User, "password_hash"> } | null;

      return result;
    } catch (error) {
      // If user already exists, that's okay - we'll handle it below
      if (DuplicateUserError.isDuplicateUserError(error)) {
        // User exists in auth, will be handled by caller
        return null;
      }

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
        200, // 200ms initial delay
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

  // Check if user already exists in public.users table
  const existingUser = await findExistingUser(client, email);
  if (existingUser) {
    // Verify the user can actually log in (password might be wrong)
    try {
      const testLogin = await authService.login({ email, password });
      if (testLogin.user) {
        return {
          user: existingUser,
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
        await client.auth.admin.deleteUser(existingUser.id);
      } catch (deleteError) {
        // Ignore delete errors
      }
      // Also delete from public.users
      await client.from("users").delete().eq("id", existingUser.id);
    }
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

  // If user already exists (DuplicateUserError), try to fetch from database
  if (!registerResult) {
    const duplicateUser = await findExistingUser(client, email);
    if (duplicateUser) {
      // Wait a bit for sync, then try login
      await new Promise((resolve) => setTimeout(resolve, 500));
      try {
        const testLogin = await authService.login({ email, password });
        if (testLogin.user) {
          return {
            user: duplicateUser,
            email,
            password,
          };
        }
      } catch {
        // Login failed, will throw error below
      }
    }
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

// ============================================================================
// CSRF Token Helpers
// ============================================================================

/**
 * Get CSRF token for authenticated or unauthenticated requests
 * Makes GET request to /api/csrf-token endpoint
 * For authenticated requests, pass session cookies
 * For unauthenticated requests, pass empty array or omit cookies
 * Returns both the token and cookies array (including CSRF cookie from response)
 * Does not mutate the input cookies array
 * Note: The CSRF cookie is automatically set by csrf-csrf middleware
 */
export async function getCsrfToken(
	cookies?: string[] | string,
): Promise<{ token: string; cookies: string[] }> {
	const app = (await import("../../ProjectSourceCode/src/server/app.js")).app;
	const { default: request } = await import("supertest");

  let req = request(app).get("/api/csrf-token");

  // Normalize input cookies to array format
  const inputCookies = Array.isArray(cookies)
    ? cookies
    : cookies
      ? [cookies]
      : [];

  // Only set cookies if provided (for authenticated requests)
  if (inputCookies.length > 0) {
    req = req.set("Cookie", inputCookies);
  }

  const response = await req;

  // CSRF protection is disabled (deferred to v0.2.0)
  // Return empty token and original cookies if endpoint doesn't exist
  if (response.status === 404) {
    return {
      token: "",
      cookies: inputCookies,
    };
  }

  if (response.status !== 200) {
    throw new Error(
      `Failed to get CSRF token: ${response.status} - ${response.text}`,
    );
  }

  // Extract CSRF cookie from response and merge with provided cookies array
  // This ensures subsequent requests include both session and CSRF cookies
  const csrfCookieHeader = response.headers["set-cookie"]?.[0];
  if (csrfCookieHeader) {
    // Extract just the cookie name=value part (before the first semicolon)
    const csrfCookie = csrfCookieHeader.split(";")[0];
    if (csrfCookie) {
      // Remove any existing CSRF cookies (csrf= or __Host-csrf=)
      // to avoid having multiple CSRF cookies that don't match the token
      const filteredCookies = inputCookies.filter(
        (cookie) =>
          !cookie.startsWith("csrf=") && !cookie.startsWith("__Host-csrf="),
      );
      // Return new array with CSRF cookie added (no mutation)
      return {
        token: response.body.csrfToken || "",
        cookies: [...filteredCookies, csrfCookie],
      };
    }
  }

  return {
    token: response.body.csrfToken || "",
    cookies: inputCookies,
  };
}

/**
 * Helper function to get CSRF token and merged cookies for API requests
 * Returns both the token and cookies array (including CSRF cookie from response)
 * Use this when you need to include the CSRF cookie in subsequent requests
 */
export async function getCsrfTokenWithCookies(
  cookies?: string[] | string,
): Promise<{ token: string; cookies: string[] }> {
  return getCsrfToken(cookies);
}

/**
 * Helper to conditionally set CSRF headers on a request
 * Only sets headers if CSRF token is not empty (CSRF enabled)
 * Use this to wrap request setup when CSRF may be disabled
 */
export function setCsrfHeadersIfEnabled<
  T extends { set: (key: string, value: string) => T },
>(req: T, csrfToken: string, csrfCookie?: string): T {
  if (csrfToken) {
    req = req.set("X-CSRF-Token", csrfToken);
  }
  if (csrfCookie) {
    req = req.set("Cookie", csrfCookie);
  }
  return req;
}
