import { createClient } from "@supabase/supabase-js";
import type { NextFunction, Request, Response } from "express";
import { env } from "../../config/env.js";

/**
 * Development Authentication Middleware
 *
 * Automatically logs in as the seed admin user when in development mode.
 * This allows "live preview" of features without needing to go through
 * the full auth flow every time the server restarts.
 *
 * It fetches the REAL user from the database so that services work correctly.
 */
export const devAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  // Only run in development and if not already authenticated
  if (env.NODE_ENV === "development" && !req.user) {
    try {
      // Use Service Role Key to bypass RLS and fetch the admin user
      if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
        console.warn(
          "[DevAuth] Missing SUPABASE_SERVICE_ROLE_KEY, skipping auto-login"
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
        }
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
      console.warn("[DevAuth] Failed to auto-login:", err);
      // Continue without auth if it fails
    }
  }
  next();
};
