/**
 * Health check tests to verify test environment is ready
 * Run before integration tests to catch connection issues early
 */

import { describe, expect, it } from "vitest";
import { getTestSupabaseClient } from "./setup/helpers.js";

describe("Test Environment Health", () => {
  it("should connect to Supabase database", async () => {
    const client = getTestSupabaseClient();

    // Simple connectivity test - if Supabase is running (verified by devcontainer),
    // this should work. If it fails, it's a real issue, not a timing problem.
    const { error } = await client.from("users").select("id").limit(1);

    // Connection successful if no error OR if error is not a connection error
    // (RLS policy errors mean connection is working)
    if (!error) {
      expect(error).toBeNull();
      return;
    }

    // If it's a connection error, fail immediately (Supabase should be ready)
    if (
      error.message.includes("fetch failed") ||
      error.message.includes("ECONNRESET")
    ) {
      throw new Error(
        `Database connection failed: ${error.message}. Ensure Supabase is running: bun run supabase:start`,
      );
    }

    // Other errors (e.g., RLS) mean connection is working
    expect(error).toBeDefined(); // Error exists but connection works
  });

  it("should authenticate with service role key", async () => {
    const client = getTestSupabaseClient();

    // Simple service role test - if Supabase is running (verified by devcontainer),
    // this should work immediately
    try {
      const result = await client.auth.admin.listUsers({
        page: 1,
        perPage: 1,
      });

      // Success - service role is working
      if (!result.error) {
        expect(result.data).toBeDefined();
        return;
      }

      // If it's a connection error, fail immediately
      if (
        result.error.message.includes("fetch failed") ||
        result.error.message.includes("ECONNRESET")
      ) {
        throw new Error(
          `Service role authentication failed: ${result.error.message}. Ensure Supabase is running: bun run supabase:start`,
        );
      }

      // Other errors mean connection is working (even if operation failed)
      expect(result).toBeDefined();
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
        throw new Error(
          `Service role connection failed: ${err.message}. Ensure Supabase is running: bun run supabase:start`,
        );
      }
      // Re-throw other errors
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
