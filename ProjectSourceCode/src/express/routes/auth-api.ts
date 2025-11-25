/**
 * Auth JSON API routes using Supabase Auth
 *
 * For programmatic access (scripts, tests, mobile apps).
 * Browser form submissions use /login and /register (PRG pattern in auth.ts).
 */

import express from "express";
import { createUserSchema, loginSchema } from "../../lib/schemas/user.js";
import { AuthService } from "../../lib/services/auth.service.js";
import { getSupabaseClientForRequest } from "../../lib/supabase.js";
import {
  clearAuthCookies,
  setAuthCookies,
} from "../../lib/utils/auth-cookies.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { validate } from "../../middleware/validation.js";

const router = express.Router();

router.post("/register", validate(createUserSchema), async (req, res, next) => {
  try {
    const supabase = await getSupabaseClientForRequest(req);
    const authService = new AuthService(supabase);

    const result = await authService.register(req.body);

    if (result.session) {
      setAuthCookies(
        res,
        result.session.access_token,
        result.session.refresh_token,
      );
    }

    res.status(201).json({ user: result.user });
  } catch (error) {
    next(error);
  }
});

router.post("/login", validate(loginSchema), async (req, res, next) => {
  try {
    const supabase = await getSupabaseClientForRequest(req);
    const authService = new AuthService(supabase);

    const result = await authService.login(req.body);

    if (result.session) {
      setAuthCookies(
        res,
        result.session.access_token,
        result.session.refresh_token,
      );
    }

    res.json({ user: result.user });
  } catch (error) {
    next(error);
  }
});

router.get("/session", requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

router.post("/logout", requireAuth, async (req, res, next) => {
  try {
    const supabase = await getSupabaseClientForRequest(req);
    const authService = new AuthService(supabase);

    await authService.logout();
    clearAuthCookies(res);

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;
