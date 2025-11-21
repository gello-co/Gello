import type { Request, Response, NextFunction } from "express";
import { env } from "../../config/env.js";
import { getSupabaseClient } from "../../lib/supabase.js";

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
  res: Response,
  next: NextFunction
) => {
  // Only run in development and if not already authenticated
  if (env.NODE_ENV === "development" && !req.user) {
    try {
      const supabase = getSupabaseClient();
      
      // Try to find the seed admin user
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", "admin@test.com")
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
        req.headers['x-dev-auth'] = 'true';
      }
    } catch (err) {
      console.warn("[DevAuth] Failed to auto-login:", err);
      // Continue without auth if it fails
    }
  }
  next();
};
