/**
 * Auth Service using Supabase Auth
 * Uses Supabase Auth for authentication with custom user metadata in public.users table
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../../config/env.js';
import { getUserById, type User } from '../database/users.db.js';
import { DuplicateUserError, InvalidCredentialsError } from '../errors/app.errors.js';
import { logger } from '../logger.js';
import type { CreateUserInput, LoginInput } from '../schemas/user.js';

export type AuthResult = {
  user: Omit<User, 'password_hash'>;
  session?: {
    access_token: string;
    refresh_token: string;
  };
};

export type SessionUser = {
  id: string;
  email: string;
  display_name: string;
  role: User['role'];
  team_id: string | null;
  total_points: number;
  avatar_url: string | null;
};

/**
 * Check if a user already exists with the given email.
 */
async function checkExistingUser(serviceClient: SupabaseClient, email: string): Promise<void> {
  const { data: existingUser, error: existingUserError } = await serviceClient
    .from('users')
    .select('id, email')
    .eq('email', email)
    .maybeSingle();

  if (existingUserError && existingUserError.code !== 'PGRST116') {
    throw new Error(`Failed to check for existing user: ${existingUserError.message}`);
  }

  if (existingUser) {
    throw new DuplicateUserError('User with this email already exists');
  }
}

/**
 * Create a user in Supabase Auth.
 */
async function createAuthUser(
  client: SupabaseClient,
  input: CreateUserInput
): Promise<{
  authData: {
    // biome-ignore lint/suspicious/noExplicitAny: Supabase auth types are complex
    user: any;
    // biome-ignore lint/suspicious/noExplicitAny: Supabase auth session type
    session: any;
  };
}> {
  const { data: authData, error: authError } = await client.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        display_name: input.display_name,
        role: input.role ?? 'member',
      },
    },
  });

  // Detect duplicate registration by checking response data structure
  if (
    !authError &&
    authData.user &&
    (!authData.user.identities || authData.user.identities.length === 0)
  ) {
    throw new DuplicateUserError('User with this email already exists');
  }

  if (authError) {
    throw new Error(`Registration failed: ${authError.message}`);
  }

  if (!authData.user) {
    throw new Error('Registration failed: No user returned');
  }

  return { authData: { user: authData.user, session: authData.session } };
}

/**
 * Create user profile in public.users table.
 */
async function createUserProfile(
  serviceClient: SupabaseClient,
  authUserId: string,
  input: CreateUserInput
): Promise<User> {
  const { data: newUser, error: userError } = await serviceClient
    .from('users')
    .insert({
      id: authUserId,
      email: input.email,
      password_hash: '',
      display_name: input.display_name,
      role: input.role ?? 'member',
      team_id: input.team_id ?? null,
      avatar_url: input.avatar_url ?? null,
      total_points: input.total_points ?? 0,
    })
    .select()
    .single();

  if (userError || !newUser) {
    throw new Error(`Failed to create user profile: ${userError?.message}`);
  }

  return newUser as User;
}

/**
 * Cleanup auth user when profile creation fails.
 */
async function cleanupAuthUser(adminClient: SupabaseClient, userId: string): Promise<void> {
  try {
    await adminClient.auth.admin.deleteUser(userId);
  } catch (cleanupError) {
    logger.error({ cleanupError }, 'Failed to cleanup auth user');
  }
}

export class AuthService {
  private readonly serviceRoleClient: SupabaseClient | null;

  constructor(
    private client: SupabaseClient,
    serviceRoleClient?: SupabaseClient
  ) {
    // Allow injecting service role client for testing
    // If not provided, will be created lazily via getServiceRoleClient()
    this.serviceRoleClient = serviceRoleClient ?? null;
  }

  /**
   * Get service role client for admin operations
   * Returns injected client if provided, otherwise a cached singleton instance
   */
  private getServiceRoleClient(): SupabaseClient {
    // Use injected client if provided (for testing)
    if (this.serviceRoleClient) {
      return this.serviceRoleClient;
    }

    // Return cached client if it exists
    const cache = getCachedServiceRoleClient();
    if (cache) return cache;

    // Validate environment variables
    if (!(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY)) {
      throw new Error('Service role key required for user management operations');
    }

    // Create and cache the service-role client
    const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    setCachedServiceRoleClient(client);
    return client;
  }

  /**
   * Register a new user using Supabase Auth
   * Creates auth user and syncs to public.users table
   */
  async register(input: CreateUserInput): Promise<AuthResult> {
    const serviceClient = this.getServiceRoleClient();

    // Check if user already exists (needs service role due to RLS)
    await checkExistingUser(serviceClient, input.email);

    // Create user in Supabase Auth
    const authResult = await createAuthUser(this.client, input);
    const authUserId = authResult.authData.user.id;

    // Create corresponding record in public.users table with auth.users.id
    let newUser: User;
    try {
      newUser = await createUserProfile(serviceClient, authUserId, input);
    } catch (error) {
      // Cleanup: delete auth user if we can't create public.users record
      await cleanupAuthUser(serviceClient, authUserId);
      throw error;
    }

    const { password_hash: _, ...userWithoutPassword } = newUser;

    return {
      user: userWithoutPassword,
      session: authResult.authData.session
        ? {
            access_token: authResult.authData.session.access_token,
            refresh_token: authResult.authData.session.refresh_token,
          }
        : undefined,
    };
  }

  /**
   * Login using Supabase Auth
   */
  async login(input: LoginInput): Promise<AuthResult> {
    const { data: authData, error: authError } = await this.client.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (authError || !authData.user) {
      throw new InvalidCredentialsError('Invalid email or password');
    }

    // After signInWithPassword, the client has the session and RLS will work
    // Use the authenticated client to respect RLS policies
    let user = await getUserById(this.client, authData.user.id);
    if (!user) {
      // User exists in auth but not in public.users - create profile
      // This can happen if user was created directly in auth or profile was deleted
      // Use service-role client only for the INSERT operation to bypass RLS
      const serviceClient = this.getServiceRoleClient();
      const { data: newUser, error: userError } = await serviceClient
        .from('users')
        .insert({
          id: authData.user.id,
          email: authData.user.email ?? input.email,
          password_hash: '', // Not used with Supabase Auth
          display_name:
            authData.user.user_metadata?.display_name ??
            authData.user.email?.split('@')[0] ??
            'User',
          role: (authData.user.user_metadata?.role as User['role']) ?? 'member',
          team_id: authData.user.user_metadata?.team_id ?? null,
          avatar_url: authData.user.user_metadata?.avatar_url ?? null,
        })
        .select()
        .single();

      if (userError || !newUser) {
        throw new Error(`User profile not found and failed to create: ${userError?.message}`);
      }
      user = newUser as User;
    }

    const { password_hash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      session: authData.session
        ? {
            access_token: authData.session.access_token,
            refresh_token: authData.session.refresh_token,
          }
        : undefined,
    };
  }

  /**
   * Get current session from Supabase
   */
  async getSession(): Promise<SessionUser | null> {
    const {
      data: { session },
    } = await this.client.auth.getSession();

    if (!session?.user) {
      return null;
    }

    const user = await getUserById(this.client, session.user.id);
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      role: user.role,
      team_id: user.team_id,
      total_points: user.total_points,
      avatar_url: user.avatar_url,
    };
  }

  /**
   * Logout using Supabase Auth
   */
  async logout(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) {
      throw new Error(`Logout failed: ${error.message}`);
    }
  }
}

let cachedServiceRoleClient: SupabaseClient | null = null;
const getCachedServiceRoleClient = (): SupabaseClient | null => cachedServiceRoleClient;
const setCachedServiceRoleClient = (client: SupabaseClient): void => {
  cachedServiceRoleClient = client;
};
export const resetServiceRoleClientCache = (): void => {
  cachedServiceRoleClient = null;
};
