import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config/env";

let client: SupabaseClient | null = null;

/**
 * Get global singleton Supabase client for server-side operations
 * Note: This client does NOT handle session persistence (see getSupabaseClientForRequest for per-request clients with session support)
 */
export function getSupabaseClient() {
  if (client) return client;
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      "Supabase env not configured: SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY",
    );
  }
  // Global singleton client for server-side operations
  // Note: This client does NOT persist sessions because:
  // 1. It's a singleton shared across all requests (no per-request state)
  // 2. Session persistence is handled by per-request clients via getSupabaseClientForRequest()
  // 3. Per-request clients restore sessions from httpOnly cookies in middleware
  // Storage methods are no-op placeholders (not used when persistSession: false)
  client = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return client;
}

/**
 * Get Supabase client for a specific request with cookie-based session
 */
export async function getSupabaseClientForRequest(req: {
  cookies?: Record<string, string>;
}): Promise<SupabaseClient> {
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      "Supabase env not configured: SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY",
    );
  }

  const client = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  // Set session from cookies if available
  const accessToken = req.cookies?.["sb-access-token"];
  const refreshToken = req.cookies?.["sb-refresh-token"];

  if (accessToken && refreshToken) {
    // Set the session on the client and await it
    try {
      await client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    } catch (error) {
      // Log for debugging but don't throw - invalid sessions are expected
      // Only log safe error details to avoid exposing sensitive session/token data
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : "Error";
      console.debug(
        "Failed to restore session from cookies:",
        `${errorName}: ${errorMessage}`,
      );
    }
  }

  return client;
}
