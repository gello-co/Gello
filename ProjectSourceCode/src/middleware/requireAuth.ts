/**
 * Authentication middleware using Supabase Auth
 * Sessions stored in secure, httpOnly cookies
 */

import { createClient } from "@supabase/supabase-js";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { getUserById } from "../lib/database/users.db.js";
import { logger } from "../lib/logger.js";

const isBypassEnabled =
  process.env.NODE_ENV !== "production" &&
  (process.env.ALLOW_TEST_BYPASS === undefined ||
    process.env.ALLOW_TEST_BYPASS === "true");

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

  const accessToken = req.cookies?.["sb-access-token"];
  if (!accessToken) {
    return handleUnauthorized(req, res);
  }

  try {
    if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
      logger.error("[requireAuth] Missing Supabase configuration");
      return handleUnauthorized(req, res);
    }

    // Create scoped client with user's access token
    const scopedClient = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_PUBLISHABLE_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      },
    );

    // Use Supabase's getUser() which verifies JWT signature
    const {
      data: { user },
      error: authError,
    } = await scopedClient.auth.getUser(accessToken);

    if (authError || !user) {
      logger.debug(
        { authError: authError?.message },
        "[requireAuth] JWT verification failed",
      );
      return handleUnauthorized(req, res);
    }

    // Get user profile from database
    const userProfile = await getUserById(scopedClient, user.id);
    if (!userProfile) {
      logger.warn({ userId: user.id }, "[requireAuth] Profile not found");
      return handleUnauthorized(req, res);
    }

    req.supabase = scopedClient;
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

function handleUnauthorized(req: Request, res: Response) {
  if (req.headers["hx-request"]) {
    res.set("HX-Redirect", "/login");
    return res.status(401).end();
  }
  if (req.path.startsWith("/api/") || req.baseUrl.startsWith("/api")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return res.redirect("/login");
}
