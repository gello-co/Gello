/**
 * Authentication middleware using Supabase Auth
 * Sessions stored in secure, httpOnly cookies
 */

import type { NextFunction, Request, Response } from "express";
import { AuthService } from "../../lib/services/auth.service.js";
import { getSupabaseClientForRequest } from "../../lib/supabase.js";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    // Get Supabase client with session from cookies (awaits session setting)
    const supabase = await getSupabaseClientForRequest(req);

    // Verify session is valid by checking auth state
    const {
      data: { session: authSession },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !authSession) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const authService = new AuthService(supabase);
    // Get session from Supabase Auth
    const session = await authService.getSession();
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.user = session;
    next();
  } catch (error) {
    // Log authentication errors for monitoring and debugging
    const errorLog = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      error: {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : String(error),
        stack:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.stack
            : undefined,
      },
    };
    console.error("[AUTH ERROR]", JSON.stringify(errorLog, null, 2));

    return res.status(401).json({ error: "Authentication failed" });
  }
}
