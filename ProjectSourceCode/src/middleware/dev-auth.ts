import { createClient } from "@supabase/supabase-js";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { isMockMode } from "../contracts/container.js";
import { DEFAULT_MOCK_USER } from "../contracts/fixtures/index.js";
import { logger } from "../lib/logger.js";

/**
 * Development Authentication Middleware
 *
 * Automatically logs in as a user when in development mode.
 *
 * In Mock Mode (MOCK_MODE=true + MOCK_AUTO_LOGIN=true):
 * - Uses mock fixture data, no database required
 * - Auto-logs in as DEFAULT_MOCK_USER (admin)
 *
 * In Real Mode (development):
 * - Fetches the REAL admin user from the database
 * - Requires SUPABASE_SERVICE_ROLE_KEY
 */
export const devAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  // Skip if already authenticated
  if (req.user) {
    return next();
  }

  // Mock Mode: Use fixture user
  if (isMockMode() && process.env.MOCK_AUTO_LOGIN === "true") {
    req.user = {
      id: DEFAULT_MOCK_USER.id,
      email: DEFAULT_MOCK_USER.email,
      display_name: DEFAULT_MOCK_USER.display_name,
      role: DEFAULT_MOCK_USER.role,
      team_id: DEFAULT_MOCK_USER.team_id,
      total_points: DEFAULT_MOCK_USER.total_points,
      avatar_url: DEFAULT_MOCK_USER.avatar_url,
    };
    req.headers["x-dev-auth"] = "mock";
    logger.debug(
      { userId: DEFAULT_MOCK_USER.id },
      "[DevAuth] Mock auto-login enabled",
    );
    return next();
  }

  // Real Mode: Auto-login in development
  if (env.NODE_ENV === "development") {
    try {
      // Use Service Role Key to bypass RLS and fetch the admin user
      if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
        logger.warn(
          "[DevAuth] Missing SUPABASE_SERVICE_ROLE_KEY, skipping auto-login",
        );
        return next();
      }

      const supabase = createClient(
        env.SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        },
      );

      // Use hardcoded Admin UUID for reliable auto-login
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", "22222222-2222-2222-2222-222222222222")
        .single();

      if (user && !error) {
        req.user = {
          id: user.id,
          email: user.email,
          display_name: user.display_name,
          role: user.role,
          team_id: user.team_id,
          total_points: user.total_points,
          avatar_url: user.avatar_url,
        };
        // Add a header to indicate this was a dev auto-login
        req.headers["x-dev-auth"] = "true";
      }
    } catch (err) {
      logger.warn({ err }, "[DevAuth] Failed to auto-login");
      // Continue without auth if it fails
    }
  }
  next();
};
