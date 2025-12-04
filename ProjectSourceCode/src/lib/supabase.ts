/**
 * Supabase Client Factory
 *
 * This module provides three types of Supabase clients:
 *
 * 1. getSupabaseClient() - Global singleton for anonymous server operations
 * 2. createAuthenticatedClient(req, res) - Per-request client with cookie-based auth (PRIMARY)
 * 3. getServiceRoleClient() - Admin operations that bypass RLS
 *
 * IMPORTANT: For authenticated user operations, ALWAYS use createAuthenticatedClient().
 * This uses @supabase/ssr which handles:
 * - Cookie parsing (reads session from request)
 * - Cookie setting (writes refreshed tokens to response)
 * - Automatic token refresh
 * - PKCE flow for OAuth
 */

import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Request, Response } from 'express';
import { env } from '../config/env';

let client: SupabaseClient | null = null;
let serviceRoleClient: SupabaseClient | null = null;

/**
 * Get global singleton Supabase client for anonymous server-side operations.
 *
 * Use this ONLY for operations that don't require user context:
 * - Health checks
 * - Public data queries
 * - Operations where RLS isn't needed
 *
 * For authenticated operations, use createAuthenticatedClient() instead.
 */
export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  if (!(env.SUPABASE_URL && env.SUPABASE_PUBLISHABLE_KEY)) {
    throw new Error('Supabase env not configured: SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY');
  }

  client = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return client;
}

/**
 * Create an authenticated Supabase client for a specific request.
 *
 * This is the PRIMARY client for authenticated operations. It:
 * - Reads session tokens from request cookies
 * - Automatically refreshes expired tokens
 * - Sets updated tokens on the response
 * - Uses PKCE flow for OAuth
 *
 * The @supabase/ssr library manages all cookie handling automatically,
 * including the chunked cookie format for large tokens.
 *
 * @param req Express request object
 * @param res Express response object
 * @returns Supabase client with user's session context
 *
 * @example
 * ```typescript
 * router.get('/api/data', async (req, res) => {
 *   const supabase = createAuthenticatedClient(req, res);
 *   const { data: { user } } = await supabase.auth.getUser();
 *   // ... use client with user's RLS permissions
 * });
 * ```
 */
export function createAuthenticatedClient(req: Request, res: Response): SupabaseClient {
  if (!(env.SUPABASE_URL && env.SUPABASE_PUBLISHABLE_KEY)) {
    throw new Error('Supabase env not configured: SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY');
  }

  // Determine if we're in a secure context (HTTPS)
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';

  return createServerClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        // Parse cookies from request header
        const parsed = parseCookieHeader(req.headers.cookie ?? '');
        const cookies = parsed
          .filter((cookie): cookie is { name: string; value: string } => cookie.value !== undefined)
          .map(({ name, value }) => ({ name, value }));

        if (process.env.DEBUG_SUPABASE) {
          console.debug(
            '[supabase] Reading cookies:',
            cookies.map((c) => c.name).join(', ') || '(none)'
          );
        }

        return cookies;
      },
      setAll(cookiesToSet) {
        // Guard against setting cookies after headers are sent
        // This can happen with Supabase SSR auth state change callbacks
        if (res.headersSent) {
          if (process.env.DEBUG_SUPABASE) {
            console.debug(
              '[supabase] Headers already sent, skipping cookie set:',
              cookiesToSet.map((c) => c.name).join(', ') || '(none)'
            );
          }
          return;
        }

        if (process.env.DEBUG_SUPABASE) {
          console.debug(
            '[supabase] Setting cookies:',
            cookiesToSet.map((c) => c.name).join(', ') || '(none)'
          );
        }

        // Set cookies on the response
        cookiesToSet.forEach(({ name, value, options }) => {
          const mergedOptions = {
            path: '/',
            sameSite: 'lax' as const,
            secure: isSecure,
            httpOnly: true,
            ...options,
          };

          res.appendHeader('Set-Cookie', serializeCookieHeader(name, value, mergedOptions));
        });
      },
    },
    auth: {
      // PKCE flow for secure OAuth - stores code verifier in cookies
      flowType: 'pkce',
    },
  });
}

/**
 * Get service role Supabase client for admin operations.
 *
 * WARNING: This client bypasses ALL Row Level Security policies.
 * Use only for:
 * - Creating user profiles after OAuth signup
 * - Admin operations that require elevated privileges
 * - Background jobs that need full database access
 *
 * Never expose this client to user-facing code paths.
 */
export function getServiceRoleClient(): SupabaseClient {
  if (serviceRoleClient) return serviceRoleClient;

  if (!(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY)) {
    throw new Error(
      'Service role key required for admin operations: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  serviceRoleClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return serviceRoleClient;
}
