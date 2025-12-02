import { randomUUID } from "node:crypto";
import type { User } from "../../../ProjectSourceCode/src/lib/database/users.db.js";
import { DuplicateUserError } from "../../../ProjectSourceCode/src/lib/errors/app.errors.js";
import { AuthService } from "../../../ProjectSourceCode/src/lib/services/auth.service.js";
import { SEEDED_USER_PASSWORD } from "../../../scripts/seed-simple.js";
import { setCsrfHeadersIfEnabled } from "./csrf.js";
import {
  createTimeoutPromise,
  getAnonSupabaseClient,
  getTestSupabaseClient,
  isRateLimitError,
  RETRY_CONFIG,
  retryWithBackoff,
} from "./db.js";

export { SEEDED_USER_PASSWORD };

export type TestUser = {
  user: User;
  email: string;
  password: string;
};

export type SessionTokens = {
  access_token: string;
  refresh_token: string;
};

const ADMIN_CREDENTIALS = {
  email: "admin@test.com",
  password: SEEDED_USER_PASSWORD,
  displayName: "Test Admin",
} as const;

// Note: SEEDED_USER_FIXTURES removed - tests now use fresh users via generateTestEmail()
// Seeded users (admin@test.com, manager@test.com, member@test.com) are only for manual testing

async function findExistingUser(
  client: ReturnType<typeof getTestSupabaseClient>,
  email: string,
): Promise<User | null> {
  const { data: userData } = await client
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  return userData ? (userData as User) : null;
}

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
          3,
          300,
        ),
        createTimeoutPromise(
          RETRY_CONFIG.registerTimeout,
          "Register timeout after 3 seconds",
        ),
      ])) as { user: Omit<User, "password_hash"> } | null;

      return result;
    } catch (error) {
      if (DuplicateUserError.isDuplicateUserError(error)) {
        return null;
      }

      lastError = error as Error;

      if (isRateLimitError(error)) {
        retries--;
        if (retries > 0) {
          const delay = 2 ** (RETRY_CONFIG.maxRetries - retries) * 500;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      throw error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error(
    "Unexpected: registerUserWithRetry exited without result or error",
  );
}

async function retrieveUserWithRetry(
  client: ReturnType<typeof getTestSupabaseClient>,
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
        2,
        200,
      );

      if (result.data) {
        return result.data as User;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_CONFIG.userSyncDelay),
      );
    } catch (error) {
      if (i === RETRY_CONFIG.userSyncRetries - 1) {
        throw new Error(
          `Failed to retrieve created user ${email} after retries: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }

      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_CONFIG.userSyncDelay),
      );
    }
  }

  throw new Error(`Failed to retrieve created user: ${email}`);
}

async function ensureAdminUser(): Promise<void> {
  const client = getTestSupabaseClient();

  const existingAdmin = await findExistingUser(client, ADMIN_CREDENTIALS.email);
  if (!existingAdmin) {
    throw new Error(
      `Seeded admin account (${ADMIN_CREDENTIALS.email}) is missing. Re-run 'bun run seed' before running tests.`,
    );
  }
}

export async function createTestUser(
  email: string,
  password: string,
  role: User["role"] = "member",
  displayName?: string,
): Promise<TestUser> {
  const client = getTestSupabaseClient();
  const authClient = getAnonSupabaseClient();
  const authService = new AuthService(authClient);

  // Always create fresh users for tests - no reuse of existing users
  // This ensures full test isolation and eliminates auth state conflicts
  // Even if a user exists with matching credentials, we delete and recreate
  // to ensure Supabase Auth state is fresh and synchronized
  const existingUser = await findExistingUser(client, email);

  // Always delete existing user to ensure fresh state
  // This prevents auth state synchronization issues in parallel test execution
  if (existingUser) {
    try {
      await client.auth.admin.deleteUser(existingUser.id);
    } catch {
      // ignore if already deleted or doesn't exist in auth
    }
    try {
      await client.from("users").delete().eq("id", existingUser.id);
    } catch {
      // ignore if already deleted
    }
  }

  // Create new user
  const displayNameValue = displayName ?? email.split("@")[0] ?? "Test User";
  const registerResult = await registerUserWithRetry(
    authService,
    email,
    password,
    displayNameValue,
    role,
  );

  if (registerResult?.user) {
    // Fixed delay after user creation to allow Supabase Auth to sync
    // Configurable via TEST_AUTH_SYNC_DELAY env var (default: 500ms)
    const syncDelay = parseInt(process.env.TEST_AUTH_SYNC_DELAY || "500", 10);
    await new Promise((resolve) => setTimeout(resolve, syncDelay));

    return {
      user: { ...registerResult.user, password_hash: "" } as User,
      email,
      password,
    };
  }

  // Handle race condition: user might have been created by another test
  // In this case, delete and retry once to ensure fresh creation
  if (!registerResult) {
    const duplicateUser = await findExistingUser(client, email);
    if (duplicateUser) {
      // Delete the duplicate and retry creation
      try {
        await client.auth.admin.deleteUser(duplicateUser.id);
      } catch {
        // ignore if already deleted
      }
      try {
        await client.from("users").delete().eq("id", duplicateUser.id);
      } catch {
        // ignore if already deleted
      }

      // Wait for cleanup to complete
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Retry registration
      const retryResult = await registerUserWithRetry(
        authService,
        email,
        password,
        displayNameValue,
        role,
      );

      if (retryResult?.user) {
        const syncDelay = parseInt(
          process.env.TEST_AUTH_SYNC_DELAY || "500",
          10,
        );
        await new Promise((resolve) => setTimeout(resolve, syncDelay));

        return {
          user: { ...retryResult.user, password_hash: "" } as User,
          email,
          password,
        };
      }
    }
  }

  // Retrieve the user that was created
  const user = await retrieveUserWithRetry(client, email);

  return {
    user,
    email,
    password,
  };
}

export async function loginAsAdmin(options?: { bypass?: boolean }): Promise<{
  cookies: string[];
  cookieHeader: string;
  access_token?: string;
  refresh_token?: string;
  bypassHeaders?: Record<string, string>;
}> {
  await ensureAdminUser();
  return loginAsUser(
    ADMIN_CREDENTIALS.email,
    ADMIN_CREDENTIALS.password,
    options,
  );
}

/**
 * Login via the app's login endpoint and return cookies.
 * Uses the real production login flow for realistic testing.
 *
 * For MVP reliability: includes a fixed delay after login to allow
 * Supabase Auth to sync session state before returning.
 *
 * @param email - User email address
 * @param password - User password
 * @param options - Optional configuration
 * @param options.bypass - If true, returns bypass headers instead of real cookies (test env only)
 * @returns Object with cookies array or bypass headers
 */
export async function loginAsUser(
  email: string,
  password: string,
  options?: { bypass?: boolean },
): Promise<{
  cookies: string[];
  cookieHeader: string;
  access_token?: string;
  refresh_token?: string;
  bypassHeaders?: Record<string, string>;
}> {
  // MVP: Test bypass option for rapid local development
  // Only available in test environment
  if (options?.bypass && process.env.NODE_ENV === "test") {
    return {
      cookies: [],
      cookieHeader: "",
      bypassHeaders: {
        "X-Test-Bypass": "true",
        "X-Test-User-Id": email, // Use email as user identifier for bypass
      },
    };
  }

  // Import app and request dynamically to avoid circular dependencies
  const { app } = await import("../../../ProjectSourceCode/src/server/app.js");
  const request = (await import("supertest")).default;

  // Get CSRF token if needed
  const { token: csrfToken, cookie: csrfCookie } = await getCsrfTokenSafe();

  // Call the real login endpoint
  let loginReq = request(app).post("/auth/login");
  loginReq = setCsrfHeadersIfEnabled(loginReq, csrfToken, csrfCookie);

  const response = await loginReq.send({ email, password });

  if (!response.ok) {
    throw new Error(
      `Login failed: ${response.status} - ${
        response.text || response.body?.error || "Unknown error"
      }`,
    );
  }

  // Extract cookies from Set-Cookie headers
  const setCookies = response.headers["set-cookie"];
  if (!setCookies || !Array.isArray(setCookies) || setCookies.length === 0) {
    throw new Error("No cookies returned from login endpoint");
  }

  // Extract cookie values (remove attributes like HttpOnly, Secure, etc.)
  // Join cookies as a single Cookie header string for supertest (more reliable than array)
  const cookieStrings = setCookies
    .map((cookie: string) => {
      // Extract just the name=value part (before first semicolon)
      const nameValue = cookie.split(";")[0]?.trim();
      return nameValue;
    })
    .filter(
      (c): c is string =>
        typeof c === "string" && c.length > 0 && c.includes("="),
    );

  if (cookieStrings.length === 0) {
    throw new Error(
      `No valid cookies extracted from login response. Set-Cookie headers: ${JSON.stringify(
        setCookies,
      )}`,
    );
  }

  // Join cookies with "; " (semicolon + space) as per HTTP Cookie header spec
  const cookieHeader = cookieStrings.join("; ");

  // Extract access_token and refresh_token from cookies for E2E tests
  // Parse cookie strings to extract token values
  const parseCookieValue = (name: string): string | undefined => {
    const cookie = cookieStrings.find((c) => c.startsWith(`${name}=`));
    if (!cookie) return undefined;
    const match = cookie.match(new RegExp(`${name}=([^;]+)`));
    return match?.[1];
  };

  const access_token = parseCookieValue("sb-access-token");
  const refresh_token = parseCookieValue("sb-refresh-token");

  // MVP: Fixed delay after login to allow Supabase Auth to sync session state
  // This is simpler and more reliable than complex polling for MVP
  // Configurable via TEST_AUTH_SYNC_DELAY env var (default: 500ms)
  const syncDelay = parseInt(process.env.TEST_AUTH_SYNC_DELAY || "500", 10);
  await new Promise((resolve) => setTimeout(resolve, syncDelay));

  // Return both array (for backward compatibility) and joined string (preferred)
  // Also include tokens for E2E tests that need them
  return {
    cookies: cookieStrings,
    cookieHeader,
    access_token,
    refresh_token,
  };
}

/**
 * Helper to get CSRF token safely (handles case where CSRF is disabled).
 */
async function getCsrfTokenSafe(): Promise<{ token: string; cookie: string }> {
  const { app } = await import("../../../ProjectSourceCode/src/server/app.js");
  const request = (await import("supertest")).default;

  const csrfResponse = await request(app).get("/api/csrf-token");
  if (csrfResponse.status === 404) {
    return { token: "", cookie: "" };
  }
  return {
    token: csrfResponse.body.csrfToken || "",
    cookie: csrfResponse.headers["set-cookie"]?.[0]?.split(";")[0] || "",
  };
}

export function generateTestEmail(label: string): string {
  const normalized = label
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${normalized || "user"}-${randomUUID()}@test.local`;
}
