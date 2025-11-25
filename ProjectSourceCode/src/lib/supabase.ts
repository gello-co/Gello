import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Request, Response } from "express";
import { env } from "../config/env";

let client: SupabaseClient | null = null;
let serviceRoleClient: SupabaseClient | null = null;

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
 * Accepts Express Request object or a minimal object with cookies/headers
 */
export async function getSupabaseClientForRequest(
  req:
    | Request
    | { cookies?: Record<string, string>; headers?: Record<string, unknown> },
): Promise<SupabaseClient> {
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      "Supabase env not configured: SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY",
    );
  }

  // Extract access token early to set it on the client for RLS
  let accessTokenForClient: string | undefined;

  // Try to get access token from cookies first
  if ("cookies" in req && req.cookies) {
    accessTokenForClient = req.cookies["sb-access-token"];
  }

  // Fallback: Parse from Cookie header if cookie-parser didn't work (common in tests)
  if (!accessTokenForClient) {
    let cookieHeader: string | undefined;
    if ("get" in req && typeof req.get === "function") {
      cookieHeader = req.get("Cookie") || req.get("cookie");
    } else if ("headers" in req) {
      const headers = req.headers as Record<string, unknown>;
      cookieHeader = (headers.cookie as string) || (headers.cookie as string);
    }

    if (cookieHeader) {
      const match = cookieHeader?.match(
        /(?:^|;\s*)sb-access-token\s*=\s*([^;]*)(?:;|$)/,
      );
      if (match?.[1]) {
        accessTokenForClient = match[1].trim();
        try {
          accessTokenForClient = accessTokenForClient.includes("%")
            ? decodeURIComponent(accessTokenForClient)
            : accessTokenForClient;
        } catch {
          // Use as-is if decoding fails
        }
      }
    }
  }

  const client = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: accessTokenForClient
        ? { Authorization: `Bearer ${accessTokenForClient}` }
        : {},
    },
  });

  // Helper to decode JWT without verification (just to inspect claims)
  const decodeJWT = (
    token: string,
  ): { sub?: string; [key: string]: unknown } | null => {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) {
        return null;
      }
      const payload = parts[1];
      if (!payload) {
        return null;
      }
      const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
      const decoded = Buffer.from(padded, "base64url").toString("utf-8");
      return JSON.parse(decoded) as { sub?: string; [key: string]: unknown };
    } catch {
      return null;
    }
  };

  let accessToken = accessTokenForClient;
  let refreshToken: string | undefined;

  if ("cookies" in req && req.cookies) {
    refreshToken = req.cookies["sb-refresh-token"];
  }

  if (!refreshToken) {
    let cookieHeader: string | undefined;
    if ("get" in req && typeof req.get === "function") {
      cookieHeader = req.get("Cookie") || req.get("cookie");
    } else if ("headers" in req) {
      const headers = req.headers as Record<string, unknown>;
      cookieHeader =
        (headers.cookie as string) ||
        (headers.cookie as string) ||
        (headers.Cookie as string);
    }

    if (cookieHeader) {
      const parseCookie = (name: string): string | undefined => {
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(
          `(?:^|;\\s*)${escapedName}\\s*=\\s*([^;]*)(?:;|$)`,
        );
        const match = cookieHeader?.match(regex);
        if (match?.[1]) {
          const value = match[1].trim();
          try {
            return value.includes("%") ? decodeURIComponent(value) : value;
          } catch {
            return value;
          }
        }
        return undefined;
      };
      if (!accessToken) accessToken = parseCookie("sb-access-token");
      if (!refreshToken) refreshToken = parseCookie("sb-refresh-token");

      if (process.env.DEBUG_SUPABASE) {
        console.debug(
          "[supabase] Manual parse result:",
          `accessToken: ${!!accessToken} (${accessToken?.length || 0} chars)${accessToken ? ` [${accessToken.substring(0, 50)}...]` : ""}, refreshToken: ${!!refreshToken} (${refreshToken?.length || 0} chars)${refreshToken ? ` [${refreshToken.substring(0, 50)}...]` : ""}`,
        );
      }
    } else if (process.env.DEBUG_SUPABASE) {
      console.debug("[supabase] No Cookie header found in request");
    }
  }

  let decodedToken: { sub?: string } | null = null;

  // Verify access token is a valid JWT with sub claim before attempting session restoration
  if (accessToken) {
    decodedToken = decodeJWT(accessToken);
    if (process.env.DEBUG_SUPABASE) {
      if (!decodedToken) {
        console.debug("[supabase] Access token is not a valid JWT format");
      } else if (!decodedToken.sub) {
        console.debug(
          "[supabase] Access token missing 'sub' claim - might be an API key, not a user JWT",
          "Decoded payload:",
          JSON.stringify(decodedToken, null, 2),
        );
        // Don't attempt session restoration with invalid token
        return client;
      } else {
        console.debug(
          "[supabase] Access token is valid JWT with sub claim:",
          decodedToken.sub,
        );
      }
    }

    // If token is missing sub claim, it's likely an API key, not a user JWT
    // Return client without session to avoid invalid session errors
    if (!decodedToken || !decodedToken.sub) {
      if (process.env.DEBUG_SUPABASE) {
        console.debug(
          "[supabase] Skipping session restoration - invalid or missing sub claim",
        );
      }
      return client;
    }
  }

  // Option A: Force setSession() to work even if it reports errors
  // Supabase local sometimes reports "missing sub claim" errors even when the JWT is valid
  // We verify the session was actually established by checking getSession() afterwards
  if (accessToken && refreshToken) {
    try {
      // Attempt to set the session
      const { error } = await client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      // Verify session was actually established (ignore error if session exists)
      const {
        data: { session: verifiedSession },
      } = await client.auth.getSession();

      if (verifiedSession) {
        // Session is established - success!
        if (process.env.DEBUG_SUPABASE) {
          console.debug(
            "[supabase] Session established successfully (User ID:",
            verifiedSession.user.id,
            ")",
          );
        }
        return client;
      }

      // If setSession() reported an error but we don't have a session, log it
      if (error && process.env.DEBUG_SUPABASE) {
        console.debug(
          "[supabase] setSession() reported error but session not established:",
          error.message,
        );
      }

      // If we have a valid JWT with sub claim, try to force the session
      // by directly setting it in the client's internal state
      if (accessToken && decodedToken && decodedToken.sub) {
        if (process.env.DEBUG_SUPABASE) {
          console.debug(
            "[supabase] Attempting to force session with valid JWT (sub:",
            decodedToken.sub,
            ")",
          );
        }

        // Try getUser() to verify token is valid
        const { data: userData, error: userError } =
          await client.auth.getUser(accessToken);

        if (!userError && userData.user) {
          // Token is valid - the Authorization header should work for RPC calls
          // Even if setSession() failed, the header is set and auth.uid() should work
          if (process.env.DEBUG_SUPABASE) {
            console.debug(
              "[supabase] Token validated via getUser(), relying on Authorization header for RPC",
            );
          }
          return client;
        }

        if (process.env.DEBUG_SUPABASE) {
          console.debug(
            "[supabase] Token validation failed:",
            userError?.message || "Unknown error",
          );
        }
      }
    } catch (err) {
      if (process.env.DEBUG_SUPABASE) {
        console.debug(
          "[supabase] setSession() exception:",
          err instanceof Error ? err.message : String(err),
        );
      }
    }
  }

  // Return client with Authorization header set (may work for RPC even without session)
  return client;
}

/**
 * Get service role Supabase client for admin operations (bypasses RLS)
 * Used for operations like creating user profiles after OAuth, managing users, etc.
 */
export function getServiceRoleClient(): SupabaseClient {
  if (serviceRoleClient) return serviceRoleClient;

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Service role key required for admin operations: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  serviceRoleClient = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  return serviceRoleClient;
}

/**
 * Create SSR-compatible Supabase client for OAuth flows.
 * Uses @supabase/ssr for proper PKCE code verifier handling via cookies.
 *
 * This is required for OAuth because:
 * 1. OAuth uses PKCE flow which stores a code verifier in cookies during initiation
 * 2. The callback needs to read that verifier to exchange the code for a session
 * 3. Standard clients with persistSession:false lose this context
 *
 * @param req Express request object
 * @param res Express response object
 * @returns Supabase client configured for SSR cookie handling
 */
export function createSupabaseSSRClient(req: Request, res: Response) {
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      "Supabase env not configured: SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY",
    );
  }

  // Determine if we're in a secure context (HTTPS)
  const isSecure = req.secure || req.headers["x-forwarded-proto"] === "https";

  return createServerClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        // Parse cookies from request header and filter out undefined values
        const parsed = parseCookieHeader(req.headers.cookie ?? "");
        const cookies = parsed
          .filter(
            (cookie): cookie is { name: string; value: string } =>
              cookie.value !== undefined,
          )
          .map(({ name, value }) => ({ name, value }));

        // Debug logging for OAuth troubleshooting (names only, no values)
        if (process.env.DEBUG_SUPABASE) {
          console.log(
            "[SSR] getAll cookies:",
            cookies.map((c) => c.name).join(", ") || "(none)",
          );
        }

        return cookies;
      },
      setAll(cookiesToSet) {
        // Debug logging for OAuth troubleshooting (names only, no values)
        if (process.env.DEBUG_SUPABASE) {
          console.log(
            "[SSR] setAll cookies:",
            cookiesToSet.map((c) => c.name).join(", ") || "(none)",
          );
        }

        // Set cookies on the response with proper options for OAuth flow
        cookiesToSet.forEach(({ name, value, options }) => {
          // Merge default options with provided options
          // SameSite=Lax is required for OAuth redirects to work
          const mergedOptions = {
            path: "/",
            sameSite: "lax" as const,
            secure: isSecure,
            httpOnly: true,
            ...options,
          };

          res.appendHeader(
            "Set-Cookie",
            serializeCookieHeader(name, value, mergedOptions),
          );
        });
      },
    },
    auth: {
      // Use PKCE flow for server-side OAuth - returns code in query string
      // instead of tokens in URL fragment (implicit flow)
      flowType: "pkce",
    },
  });
}
