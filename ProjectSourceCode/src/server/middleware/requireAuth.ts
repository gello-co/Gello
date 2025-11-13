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
    const { data: { session: authSession }, error: sessionError } = await supabase.auth.getSession();
    
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
    return res.status(401).json({ error: "Authentication failed" });
  }
}
