/**
 * Auth JSON API routes using Supabase Auth
 *
 * For programmatic access (scripts, tests, mobile apps).
 * Browser form submissions use /login and /register (PRG pattern in auth.ts).
 */

import express from 'express';
import { logger } from '../../lib/logger.js';
import { createUserSchema, loginSchema } from '../../lib/schemas/user.js';
import { createAuthenticatedClient, getServiceRoleClient } from '../../lib/supabase.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validation.js';

const router = express.Router();

router.post('/register', validate(createUserSchema), async (req, res, next) => {
  try {
    const { email, password, display_name } = req.body;

    // Create SSR client - it will set cookies automatically on successful auth
    const supabase = createAuthenticatedClient(req, res);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name },
      },
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data.user) {
      return res.status(400).json({ error: 'Registration failed' });
    }

    // Create user profile in public.users table
    const adminClient = getServiceRoleClient();
    const { error: profileError } = await adminClient.from('users').insert({
      id: data.user.id,
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
        { error: profileError, userId: data.user.id },
        'Failed to create user profile after auth signup'
      );
      // Clean up: delete the auth user since profile creation failed
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(data.user.id);
      if (deleteError) {
        logger.error(
          { error: deleteError, userId: data.user.id },
          'Failed to clean up auth user after profile creation failure'
        );
      }
      return res.status(500).json({
        error: 'Failed to complete registration. Please try again.',
      });
    }

    // SSR client has already set the auth cookies via setAll()
    res.status(201).json({
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Create SSR client - it will set cookies automatically on successful auth
    const supabase = createAuthenticatedClient(req, res);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    // SSR client has already set the auth cookies via setAll()
    res.json({
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/session', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    const supabase = createAuthenticatedClient(req, res);
    await supabase.auth.signOut();
    // signOut() clears the session cookies via setAll()

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
