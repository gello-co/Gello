/**
 * Authentication middleware using Supabase Auth
 *
 * Uses @supabase/ssr for cookie-based session management.
 * The SSR client automatically:
 * - Reads session from cookies
 * - Refreshes expired tokens
 * - Sets updated tokens on response
 */

import { createClient } from "@supabase/supabase-js";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { getUserById } from "../lib/database/users.db.js";
import { logger } from "../lib/logger.js";
import { createAuthenticatedClient } from "../lib/supabase.js";

const isBypassEnabled =
  process.env.NODE_ENV !== "production" &&
  (process.env.ALLOW_TEST_BYPASS === undefined ||
    process.env.ALLOW_TEST_BYPASS === "true");

/**
 * Middleware that requires authentication.
 *
 * On success, attaches to request:
 * - req.supabase: Authenticated Supabase client
 * - req.user: User profile from database
 *
 * On failure:
 * - API routes: 401 JSON response
 * - Page routes: Redirect to /login
 * - HTMX requests: HX-Redirect header
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // 1. Test Bypass (Dev/Test only)
  if (isBypassEnabled && req.headers["x-test-bypass"] === "true") {
    const testUserId =
      (req.headers["x-test-user-id"] as string) || "test-user-id";
    req.user = {
      id: testUserId,
      email: "test@test.local",
      display_name: "Test User",
      role: "member",
      team_id: null,
      total_points: 0,
      avatar_url: null,
    };
    if (env.SUPABASE_URL && env.SUPABASE_PUBLISHABLE_KEY) {
      req.supabase = createClient(
        env.SUPABASE_URL,
        env.SUPABASE_PUBLISHABLE_KEY,
        {
          auth: { persistSession: false, autoRefreshToken: false },
        },
      );
    }
    logger.info(
      { path: req.path, userId: testUserId },
      "[requireAuth] Test bypass",
    );
    return next();
  }

  // 2. Create SSR client - handles cookie parsing automatically
  const supabase = createAuthenticatedClient(req, res);

  try {
    // 3. Verify user session
    // getUser() validates JWT signature server-side (more secure than getSession())
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      if (authError) {
        logger.warn(
          { error: authError.message },
          "[requireAuth] Auth verification failed",
        );
      }
      return handleUnauthorized(req, res);
    }

    // 4. Get user profile from database
    const userProfile = await getUserById(supabase, user.id);
    if (!userProfile) {
      logger.warn({ userId: user.id }, "[requireAuth] User profile not found");
      return handleUnauthorized(req, res);
    }

    // 5. Attach to request
    req.supabase = supabase;
    req.user = {
      id: userProfile.id,
      email: userProfile.email,
      display_name: userProfile.display_name,
      role: userProfile.role,
      team_id: userProfile.team_id,
      total_points: userProfile.total_points,
      avatar_url: userProfile.avatar_url,
    };

    return next();
  } catch (error) {
    logger.error({ error }, "[requireAuth] Unexpected error");
    return handleUnauthorized(req, res);
  }
}

/**
 * Handle unauthorized requests appropriately based on request type.
 */
function handleUnauthorized(req: Request, res: Response) {
  // HTMX requests: Use HX-Redirect for client-side navigation
  if (req.headers["hx-request"]) {
    res.set("HX-Redirect", "/login");
    return res.status(401).end();
  }

  // API requests: JSON error response
  if (req.path.startsWith("/api/") || req.baseUrl.startsWith("/api")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Page requests: Server-side redirect
  return res.redirect("/login");
}
