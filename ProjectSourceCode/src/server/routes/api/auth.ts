/**
 * Auth routes using Supabase Auth
 * Stores session tokens in secure, httpOnly cookies
 */

import express from "express";
import { createUserSchema, loginSchema } from "../../../lib/schemas/user.js";
import { AuthService } from "../../../lib/services/auth.service.js";
import { getSupabaseClientForRequest } from "../../../lib/supabase.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { validate } from "../../middleware/validation.js";

const router = express.Router();

router.post("/register", validate(createUserSchema), async (req, res, next) => {
  try {
    const supabase = await getSupabaseClientForRequest(req);
    const authService = new AuthService(supabase);

    const result = await authService.register(req.body);

    // Set session cookies if session was created
    if (result.session) {
      res.cookie("sb-access-token", result.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 3600000, // 1 hour
      });
      res.cookie("sb-refresh-token", result.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 604800000, // 7 days
      });
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

    // Set session cookies
    if (result.session) {
      res.cookie("sb-access-token", result.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 3600000, // 1 hour
      });
      res.cookie("sb-refresh-token", result.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 604800000, // 7 days
      });
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

    // Clear session cookies
    res.clearCookie("sb-access-token");
    res.clearCookie("sb-refresh-token");

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;
