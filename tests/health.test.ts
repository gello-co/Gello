/**
 * Health check tests to verify test environment is ready
 * Run before integration tests to catch connection issues early
 */

import { describe, expect, it } from "vitest";
import { getTestSupabaseClient } from "./setup/helpers/index.js";

describe("Test Environment Health", () => {
  it("should connect to Supabase database", async () => {
    const client = getTestSupabaseClient();

    // Service-role client should bypass RLS, so querying users table should succeed
    // This verifies both connection and service-role permissions
    const { data, error } = await client.from("users").select("id").limit(1);

    // Success - connection and service-role are working
    if (!error) {
      expect(data).toBeDefined();
      return;
    }

    // Check for connection-level errors (network, fetch, timeout)
    const errorMessage = error.message.toLowerCase();
    const isConnectionError =
      errorMessage.includes("fetch failed") ||
      errorMessage.includes("econnreset") ||
      errorMessage.includes("connection") ||
      errorMessage.includes("network") ||
      errorMessage.includes("timeout") ||
      errorMessage.includes("econnrefused") ||
      errorMessage.includes("enotfound");

    if (isConnectionError) {
      throw new Error(
        `Database connection failed: ${error.message}. Ensure Supabase is running: bun run supabase:start`,
      );
    }

    // Check for RLS/permission errors (shouldn't happen with service-role, but handle explicitly)
    const isRLSError =
      error.code === "PGRST116" ||
      errorMessage.includes("permission denied") ||
      errorMessage.includes("row-level security") ||
      errorMessage.includes("rls") ||
      errorMessage.includes("unauthorized") ||
      errorMessage.includes("forbidden");

    if (isRLSError) {
      throw new Error(
        `Service-role client has permission issues: ${error.message}. Check service-role key configuration.`,
      );
    }

    // Any other error is unexpected and should fail the test
    throw new Error(
      `Unexpected database error: ${error.message} (code: ${error.code || "unknown"}). This may indicate a configuration issue.`,
    );
  });

  it("should authenticate with service role key", async () => {
    const client = getTestSupabaseClient();

    // Test service-role admin operations - should succeed if service-role key is valid
    try {
      const result = await client.auth.admin.listUsers({
        page: 1,
        perPage: 1,
      });

      // Explicitly assert no error and data is valid
      // This ensures permission/API failures fail the test
      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data).not.toBeNull();
      expect(Array.isArray(result.data.users)).toBe(true);
      // Verify users array has expected structure (at least empty array or users with id)
      if (result.data.users.length > 0) {
        const firstUser = result.data.users[0];
        if (firstUser) {
          expect(firstUser).toBeDefined();
          expect(firstUser).toHaveProperty("id");
          expect(typeof firstUser.id).toBe("string");
        }
      }
      // Success - service role is working
      return;
    } catch (error) {
      const err = error as Error;

      // Check for connection errors in thrown exceptions
      const errorMessage = err.message.toLowerCase();
      const isConnectionError =
        errorMessage.includes("fetch failed") ||
        errorMessage.includes("econnreset") ||
        errorMessage.includes("connection") ||
        errorMessage.includes("network") ||
        errorMessage.includes("timeout") ||
        errorMessage.includes("econnrefused") ||
        errorMessage.includes("enotfound") ||
        (err.cause &&
          typeof err.cause === "object" &&
          "code" in err.cause &&
          (err.cause.code === "ECONNRESET" ||
            err.cause.code === "ECONNREFUSED" ||
            err.cause.code === "ENOTFOUND"));

      if (isConnectionError) {
        throw new Error(
          `Service role connection failed: ${err.message}. Ensure Supabase is running: bun run supabase:start`,
        );
      }

      // Re-throw other errors (they should have been handled above)
      throw err;
    }
  });

  it("should have required environment variables", () => {
    expect(
      process.env.SUPABASE_URL || process.env.SUPABASE_LOCAL_URL,
    ).toBeDefined();
    expect(
      process.env.SERVICE_ROLE_KEY ||
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SECRET_KEY,
    ).toBeDefined();
  });
});
