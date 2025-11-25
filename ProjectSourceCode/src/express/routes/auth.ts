/**
 * Authentication routes using Supabase Auth
 *
 * Handles:
 * - Login/Register pages (GET) and form submissions (POST)
 * - OAuth initiation and callbacks
 * - Session management via httpOnly cookies
 *
 * Uses PRG (Post-Redirect-Get) pattern for form submissions.
 */
import { Router } from "express";
import { logger } from "@/lib/logger.js";
import { AuthService } from "@/lib/services/auth.service.js";
import { getServiceRoleClient, getSupabaseClient } from "@/lib/supabase.js";
import { clearAuthCookies, setAuthCookies } from "@/lib/utils/auth-cookies.js";

const router = Router();

// ============================================================================
// Login
// ============================================================================

router.get("/login", (req, res) => {
  const error = req.query.error as string | undefined;
  res.render("auth/login", { layout: "auth", error });
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.render("auth/login", {
        layout: "auth",
        error: "Email and password are required",
      });
    }

    const supabase = getSupabaseClient();
    const authService = new AuthService(supabase);
    const result = await authService.login({ email, password });

    if (!result.session) {
      return res.render("auth/login", {
        layout: "auth",
        error: "Invalid credentials",
      });
    }

    setAuthCookies(
      res,
      result.session.access_token,
      result.session.refresh_token,
    );
    res.redirect("/boards");
  } catch (error) {
    logger.error({ error }, "Login error");
    res.render("auth/login", {
      layout: "auth",
      error: "Login failed. Please try again.",
    });
  }
});

// ============================================================================
// Register
// ============================================================================

router.get("/register", (req, res) => {
  const error = req.query.error as string | undefined;
  res.render("auth/register", { layout: "auth", error });
});

router.post("/register", async (req, res) => {
  try {
    // Accept snake_case from HTML forms
    const { email, password, password_confirm, display_name } = req.body;

    // Validation
    if (!email || !password || !display_name) {
      return res.render("auth/register", {
        layout: "auth",
        error: "All fields are required",
      });
    }

    if (password !== password_confirm) {
      return res.render("auth/register", {
        layout: "auth",
        error: "Passwords do not match",
      });
    }

    if (password.length < 8) {
      return res.render("auth/register", {
        layout: "auth",
        error: "Password must be at least 8 characters",
      });
    }

    const supabase = getSupabaseClient();
    const authService = new AuthService(supabase);
    const result = await authService.register({
      email,
      password,
      display_name,
    });

    if (!result.session) {
      return res.render("auth/register", {
        layout: "auth",
        error: "Registration failed. Please try again.",
      });
    }

    setAuthCookies(
      res,
      result.session.access_token,
      result.session.refresh_token,
    );
    res.redirect("/boards");
  } catch (error) {
    logger.error({ error }, "Registration error");

    // Handle specific errors
    const message =
      error instanceof Error && error.message.includes("already registered")
        ? "An account with this email already exists"
        : "Registration failed. Please try again.";

    res.render("auth/register", {
      layout: "auth",
      error: message,
    });
  }
});

// ============================================================================
// Logout
// ============================================================================

router.post("/logout", async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const authService = new AuthService(supabase);
    await authService.logout();
  } catch (error) {
    logger.error({ error }, "Logout error");
  }

  clearAuthCookies(res);
  res.redirect("/login");
});

router.get("/logout", (_req, res) => {
  // Support GET for simple logout links
  clearAuthCookies(res);
  res.redirect("/login");
});

// ============================================================================
// OAuth - Discord
// ============================================================================

router.get("/auth/discord", async (_req, res) => {
  try {
    const supabase = getSupabaseClient();
    const redirectTo = `${process.env.AUTH_SITE_URL || "http://127.0.0.1:3000"}/auth/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo },
    });

    if (error || !data.url) {
      logger.error({ error }, "Discord OAuth initiation failed");
      return res.redirect("/login?error=OAuth initialization failed");
    }

    res.redirect(data.url);
  } catch (error) {
    logger.error({ error }, "Discord OAuth initiation error");
    res.redirect("/login?error=OAuth initialization failed");
  }
});

// ============================================================================
// OAuth - GitHub
// ============================================================================

router.get("/auth/github", async (_req, res) => {
  try {
    const supabase = getSupabaseClient();
    const redirectTo = `${process.env.AUTH_SITE_URL || "http://127.0.0.1:3000"}/auth/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo },
    });

    if (error || !data.url) {
      logger.error({ error }, "GitHub OAuth initiation failed");
      return res.redirect("/login?error=OAuth initialization failed");
    }

    res.redirect(data.url);
  } catch (error) {
    logger.error({ error }, "GitHub OAuth initiation error");
    res.redirect("/login?error=OAuth initialization failed");
  }
});

// ============================================================================
// OAuth Callback (shared by all providers)
// ============================================================================

router.get("/auth/callback", async (req, res) => {
  const { code } = req.query;

  if (!code || typeof code !== "string" || code.trim() === "") {
    return res.redirect("/login?error=Invalid OAuth response");
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(
      code.trim(),
    );

    if (error || !data.session || !data.user) {
      logger.error({ error }, "OAuth callback error");
      return res.redirect("/login?error=Authentication failed");
    }

    // Sync user profile to public.users table
    await syncOAuthUserProfile(data.user);

    setAuthCookies(res, data.session.access_token, data.session.refresh_token);
    res.redirect("/boards");
  } catch (error) {
    logger.error({ error }, "OAuth callback error");
    res.redirect("/login?error=Authentication failed");
  }
});

/**
 * Syncs OAuth user to public.users table if not exists.
 */
async function syncOAuthUserProfile(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const adminClient = getServiceRoleClient();

    const { data: existingUser } = await adminClient
      .from("users")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (existingUser) return;

    const displayName =
      (user.user_metadata?.full_name as string) ||
      (user.user_metadata?.name as string) ||
      user.email?.split("@")[0] ||
      "User";

    await adminClient.from("users").insert({
      id: user.id,
      email: user.email || "",
      password_hash: "",
      display_name: displayName,
      role: "member",
      team_id: null,
      avatar_url: (user.user_metadata?.avatar_url as string) || null,
      total_points: 0,
    });

    logger.info({ userId: user.id }, "Created user profile for OAuth user");
  } catch (error) {
    logger.error(
      { error, userId: user.id },
      "Failed to sync OAuth user profile",
    );
    throw error;
  }
}

export default router;
