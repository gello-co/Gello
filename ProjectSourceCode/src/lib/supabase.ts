import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config/env";

let client: SupabaseClient | null = null;

/**
 * Get Supabase client with cookie-based session management
 * Stores session tokens in secure, httpOnly cookies
 */
export function getSupabaseClient() {
  if (client) return client;
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      "Supabase env not configured: SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY",
    );
  }
  client = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      storage: {
        getItem: (key: string) => {
          // For server-side, we'll handle cookies via Express
          // This is a placeholder - actual cookie handling in middleware
          return null;
        },
        setItem: (key: string, value: string) => {
          // Handled by Express cookie middleware
        },
        removeItem: (key: string) => {
          // Handled by Express cookie middleware
        },
      },
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
    } catch {
      // Ignore errors - session may be invalid, will be caught on first API call
    }
  }

  return client;
}
