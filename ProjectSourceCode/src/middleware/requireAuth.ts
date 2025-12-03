/**
 * Authentication middleware using Supabase Auth
 *
 * Uses @supabase/ssr for cookie-based session management.
 * The SSR client automatically:
 * - Reads session from cookies
 * - Refreshes expired tokens
 * - Sets updated tokens on response
 *
 * Dev Cookie Bypass:
 * - Set `dev-user` cookie in browser to bypass auth
 * - Format: JSON object with id, email, role, etc.
 */

import { createClient } from "@supabase/supabase-js";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { getUserById } from "../lib/database/users.db.js";
import { logger } from "../lib/logger.js";
import { BoardService } from "../lib/services/board.service.js";
import { LeaderboardService } from "../lib/services/leaderboard.service.js";
import { ListService } from "../lib/services/list.service.js";
import { PointsService } from "../lib/services/points.service.js";
import { TaskService } from "../lib/services/task.service.js";
import { createAuthenticatedClient } from "../lib/supabase.js";

const isBypassEnabled =
  process.env.NODE_ENV !== "production" &&
  (process.env.ALLOW_TEST_BYPASS === undefined ||
    process.env.ALLOW_TEST_BYPASS === "true");

const isDevCookieBypassEnabled =
  process.env.NODE_ENV === "development" ||
  process.env.DEV_COOKIE_BYPASS === "true";

/**
 * Inject services into res.locals after req.supabase is set
 */
function injectServicesAfterAuth(req: Request, res: Response): void {
  if (req.supabase) {
    res.locals.services = {
      board: new BoardService(req.supabase),
      list: new ListService(req.supabase),
      task: new TaskService(req.supabase),
      points: new PointsService(req.supabase),
      leaderboard: new LeaderboardService(req.supabase),
    };
  }
}

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
  // TEMP DEBUG
  if (process.env.DEBUG_AUTH) {
    console.log("\n=== requireAuth Debug ===");
    console.log("Path:", req.path);
    console.log("Cookie header exists:", !!req.headers.cookie);
    console.log("req.cookies keys:", Object.keys(req.cookies || {}));
  }

  // 1. Dev Cookie Bypass (for UI/UX development)
  if (isDevCookieBypassEnabled && req.cookies?.["dev-user"]) {
    try {
      const devUser = JSON.parse(req.cookies["dev-user"]);
      req.user = {
        id: devUser.id || "dev-user-id",
        email: devUser.email || "dev@gello.dev",
        display_name: devUser.name || devUser.display_name || "Dev User",
        role: devUser.role || "member",
        team_id: devUser.teamId || devUser.team_id || null,
        total_points: devUser.total_points || 0,
        avatar_url: devUser.avatar_url || null,
      };
      if (env.SUPABASE_URL && env.SUPABASE_PUBLISHABLE_KEY) {
        req.supabase = createClient(
          env.SUPABASE_URL,
          env.SUPABASE_PUBLISHABLE_KEY,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );
      }
      logger.info(
        { path: req.path, userId: req.user.id, role: req.user.role },
        "[requireAuth] Dev cookie bypass",
      );
      injectServicesAfterAuth(req, res);
      return next();
    } catch {
      logger.warn("[requireAuth] Invalid dev-user cookie, ignoring");
    }
  }

  // 2. Test Header Bypass (Dev/Test only)
  if (isBypassEnabled && req.headers["x-test-bypass"] === "true") {
    const testUserId =
      (req.headers["x-test-user-id"] as string) || "test-user-id";
    const testUserRole =
      (req.headers["x-test-user-role"] as string) || "member";
    req.user = {
      id: testUserId,
      email: "test@test.local",
      display_name: "Test User",
      role: testUserRole as "admin" | "manager" | "member",
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
      { path: req.path, userId: testUserId, role: testUserRole },
      "[requireAuth] Test bypass",
    );
    injectServicesAfterAuth(req, res);
    return next();
  }

  // 3. Create SSR client - handles cookie parsing automatically
  const supabase = createAuthenticatedClient(req, res);

  try {
    // 4. Verify user session
    // getUser() validates JWT signature server-side (more secure than getSession())
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // TEMP DEBUG
    if (process.env.DEBUG_AUTH) {
      console.log("getUser result:");
      console.log("  User email:", user?.email || "null");
      console.log("  User ID:", user?.id || "null");
      console.log("  Error:", authError?.message || "none");
    }

    if (authError || !user) {
      if (authError) {
        logger.warn(
          { error: authError.message },
          "[requireAuth] Auth verification failed",
        );
      }
      return handleUnauthorized(req, res);
    }

    // 5. Get user profile from database
    const userProfile = await getUserById(supabase, user.id);

    // TEMP DEBUG
    if (process.env.DEBUG_AUTH) {
      console.log("getUserById result:");
      console.log("  Profile found:", !!userProfile);
      console.log("  Profile email:", userProfile?.email || "null");
    }

    if (!userProfile) {
      logger.warn({ userId: user.id }, "[requireAuth] User profile not found");
      return handleUnauthorized(req, res);
    }

    // 6. Attach to request
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

    injectServicesAfterAuth(req, res);

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
