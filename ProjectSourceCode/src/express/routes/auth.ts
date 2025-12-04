/**
 * Authentication routes using Supabase Auth
 *
 * Handles:
 * - Login/Register pages (GET) and form submissions (POST)
 * - OAuth initiation and callbacks
 * - Session management via httpOnly cookies (handled by @supabase/ssr)
 *
 * Uses PRG (Post-Redirect-Get) pattern for form submissions.
 */
import { Router } from 'express';
import { env } from '@/config/env.js';
import { logger } from '@/lib/logger.js';
import { createAuthenticatedClient, getServiceRoleClient } from '@/lib/supabase.js';

const router = Router();

// ============================================================================
// Login
// ============================================================================

router.get('/login', (req, res) => {
  const error = req.query.error as string | undefined;
  res.render('auth/login', { layout: 'auth', error });
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!(email && password)) {
      return res.render('auth/login', {
        layout: 'auth',
        error: 'Email and password are required',
      });
    }

    // Create SSR client - it will set cookies automatically on successful auth
    const supabase = createAuthenticatedClient(req, res);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      logger.debug({ error: error?.message }, 'Login failed');
      return res.render('auth/login', {
        layout: 'auth',
        error: 'Invalid credentials',
      });
    }

    // SSR client has already set the auth cookies via setAll()
    res.redirect('/boards');
  } catch (error) {
    logger.error({ error }, 'Login error');
    res.render('auth/login', {
      layout: 'auth',
      error: 'Login failed. Please try again.',
    });
  }
});

// ============================================================================
// Register
// ============================================================================

router.get('/register', (req, res) => {
  const error = req.query.error as string | undefined;
  res.render('auth/register', { layout: 'auth', error });
});

router.post('/register', async (req, res) => {
  try {
    const { email, password, password_confirm, display_name } = req.body;

    // Validation
    if (!(email && password && display_name)) {
      return res.render('auth/register', {
        layout: 'auth',
        error: 'All fields are required',
      });
    }

    if (password !== password_confirm) {
      return res.render('auth/register', {
        layout: 'auth',
        error: 'Passwords do not match',
      });
    }

    if (password.length < 8) {
      return res.render('auth/register', {
        layout: 'auth',
        error: 'Password must be at least 8 characters',
      });
    }

    // Create SSR client - it will set cookies automatically on successful auth
    const supabase = createAuthenticatedClient(req, res);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name },
      },
    });

    if (error || !data.session || !data.user) {
      logger.debug({ error: error?.message }, 'Registration failed');
      return res.render('auth/register', {
        layout: 'auth',
        error: error?.message || 'Registration failed. Please try again.',
      });
    }

    const userId = data.user.id;

    // Create user profile in public.users table
    const adminClient = getServiceRoleClient();
    const { error: profileError } = await adminClient.from('users').insert({
      id: userId,
      email,
      password_hash: '',
      display_name,
      role: 'member',
      team_id: null,
      avatar_url: null,
      total_points: 0,
    });

    if (profileError) {
      logger.error(
        { error: profileError, userId },
        'Failed to create user profile after auth signup'
      );
      // Clean up: delete the auth user since profile creation failed
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
      if (deleteError) {
        logger.error(
          { error: deleteError, userId },
          'Failed to clean up auth user after profile creation failure'
        );
      }
      return res.render('auth/register', {
        layout: 'auth',
        error: 'Registration failed. Please try again.',
      });
    }

    // SSR client has already set the auth cookies via setAll()
    res.redirect('/boards');
  } catch (error) {
    logger.error({ error }, 'Registration error');

    const message =
      error instanceof Error && error.message.includes('already registered')
        ? 'An account with this email already exists'
        : 'Registration failed. Please try again.';

    res.render('auth/register', {
      layout: 'auth',
      error: message,
    });
  }
});

// ============================================================================
// Logout
// ============================================================================

router.post('/logout', async (req, res) => {
  try {
    const supabase = createAuthenticatedClient(req, res);
    await supabase.auth.signOut();
    // signOut() clears the session cookies via setAll()
  } catch (error) {
    logger.error({ error }, 'Logout error');
  }

  res.redirect('/login');
});

router.get('/logout', async (req, res) => {
  // Support GET for simple logout links
  try {
    const supabase = createAuthenticatedClient(req, res);
    await supabase.auth.signOut();
  } catch (error) {
    logger.debug({ error }, 'Logout via GET');
  }

  res.redirect('/login');
});

// ============================================================================
// OAuth - Discord
// ============================================================================

router.get('/auth/discord', async (req, res) => {
  try {
    if (!env.AUTH_SITE_URL) {
      logger.error('AUTH_SITE_URL not configured');
      return res.redirect('/login?error=OAuth not configured');
    }

    const supabase = createAuthenticatedClient(req, res);
    const redirectTo = `${env.AUTH_SITE_URL}/auth/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo },
    });

    if (error || !data.url) {
      logger.error({ error }, 'Discord OAuth initiation failed');
      return res.redirect('/login?error=OAuth initialization failed');
    }

    res.redirect(data.url);
  } catch (error) {
    logger.error({ error }, 'Discord OAuth initiation error');
    res.redirect('/login?error=OAuth initialization failed');
  }
});

// ============================================================================
// OAuth - GitHub
// ============================================================================

router.get('/auth/github', async (req, res) => {
  try {
    if (!env.AUTH_SITE_URL) {
      logger.error('AUTH_SITE_URL not configured');
      return res.redirect('/login?error=OAuth not configured');
    }

    const supabase = createAuthenticatedClient(req, res);
    const redirectTo = `${env.AUTH_SITE_URL}/auth/callback`;

    logger.info({ redirectTo, authSiteUrl: env.AUTH_SITE_URL }, 'GitHub OAuth initiation');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo },
    });

    if (error || !data.url) {
      logger.error({ error }, 'GitHub OAuth initiation failed');
      return res.redirect('/login?error=OAuth initialization failed');
    }

    res.redirect(data.url);
  } catch (error) {
    logger.error({ error }, 'GitHub OAuth initiation error');
    res.redirect('/login?error=OAuth initialization failed');
  }
});

// ============================================================================
// OAuth Callback (shared by all providers)
// ============================================================================

router.get('/auth/callback', async (req, res) => {
  const { code } = req.query;

  if (process.env.DEBUG_SUPABASE) {
    logger.info(
      {
        hasCode: !!code,
        codeLength: typeof code === 'string' ? code.length : 0,
        hasCookies: Boolean(req.headers.cookie),
      },
      'OAuth callback received'
    );
  }

  if (!code || typeof code !== 'string' || code.trim() === '') {
    logger.warn({ query: req.query }, 'OAuth callback missing code parameter');
    return res.redirect('/login?error=Invalid OAuth response');
  }

  try {
    // SSR client reads PKCE code verifier from cookies and sets session cookies
    const supabase = createAuthenticatedClient(req, res);

    const { data, error } = await supabase.auth.exchangeCodeForSession(code.trim());

    if (error) {
      logger.error(
        {
          errorName: error.name,
          errorMessage: error.message,
        },
        'exchangeCodeForSession failed'
      );
    }

    if (error || !data.session || !data.user) {
      logger.error({ error, hasSession: !!data?.session }, 'OAuth callback error');
      return res.redirect('/login?error=Authentication failed');
    }

    // Sync user profile to public.users table
    await syncOAuthUserProfile(data.user);

    // SSR client has already set the auth cookies via setAll()
    logger.info({ userId: data.user.id }, 'OAuth login successful');
    res.redirect('/boards');
  } catch (error) {
    logger.error({ error }, 'OAuth callback error');
    res.redirect('/login?error=Authentication failed');
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
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (existingUser) return;

    const displayName =
      (user.user_metadata?.full_name as string) ||
      (user.user_metadata?.name as string) ||
      user.email?.split('@')[0] ||
      'User';

    await adminClient.from('users').insert({
      id: user.id,
      email: user.email || '',
      password_hash: '',
      display_name: displayName,
      role: 'member',
      team_id: null,
      avatar_url: (user.user_metadata?.avatar_url as string) || null,
      total_points: 0,
    });

    logger.info({ userId: user.id }, 'Created user profile for OAuth user');
  } catch (error) {
    logger.error({ error, userId: user.id }, 'Failed to sync OAuth user profile');
    throw error;
  }
}

export default router;
