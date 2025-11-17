import { randomUUID } from "node:crypto";
import type { User } from "../../../ProjectSourceCode/src/lib/database/users.db.js";
import { DuplicateUserError } from "../../../ProjectSourceCode/src/lib/errors/app.errors.js";
import { AuthService } from "../../../ProjectSourceCode/src/lib/services/auth.service.js";
import { SEEDED_USER_PASSWORD } from "../../../scripts/seed-db-snaplet";
import {
  createTimeoutPromise,
  getAnonSupabaseClient,
  getTestSupabaseClient,
  isRateLimitError,
  RETRY_CONFIG,
  retryWithBackoff,
} from "./db.js";

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

const SEEDED_USER_FIXTURES: Record<string, { role: User["role"] }> = {
  "admin@test.com": { role: "admin" },
  "manager@test.com": { role: "manager" },
  "member@test.com": { role: "member" },
} as const;

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

  const seededUser = SEEDED_USER_FIXTURES[email];
  const existingUser = await findExistingUser(client, email);

  if (seededUser) {
    if (role && role !== seededUser.role) {
      console.warn(
        `[tests][auth] Requested role '${role}' for seeded user '${email}', but fixture role is '${seededUser.role}'. Using seeded role.`,
      );
    }
    if (!existingUser) {
      throw new Error(
        `Seeded user ${email} not found. Run 'bun run seed' before executing tests.`,
      );
    }
    return {
      user: existingUser,
      email,
      password: SEEDED_USER_PASSWORD,
    };
  }

  if (existingUser) {
    try {
      const testLogin = await authService.login({ email, password });
      if (testLogin.user) {
        return {
          user: existingUser,
          email,
          password,
        };
      }
    } catch {
      try {
        await client.auth.admin.deleteUser(existingUser.id);
      } catch {
        // ignore
      }
      await client.from("users").delete().eq("id", existingUser.id);
    }
  }

  const displayNameValue = displayName ?? email.split("@")[0] ?? "Test User";
  const registerResult = await registerUserWithRetry(
    authService,
    email,
    password,
    displayNameValue,
    role,
  );

  if (registerResult?.user) {
    return {
      user: { ...registerResult.user, password_hash: "" } as User,
      email,
      password,
    };
  }

  if (!registerResult) {
    const duplicateUser = await findExistingUser(client, email);
    if (duplicateUser) {
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
        // fallthrough
      }
    }
  }

  const user = await retrieveUserWithRetry(client, email);

  return {
    user,
    email,
    password,
  };
}

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

export async function loginAsUser(
  email: string,
  password: string,
): Promise<SessionTokens> {
  const authClient = getAnonSupabaseClient();
  const authService = new AuthService(authClient);

  return loginUser(authService, email, password);
}

export function generateTestEmail(label: string): string {
  const normalized = label
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${normalized || "user"}-${randomUUID()}@test.local`;
}
