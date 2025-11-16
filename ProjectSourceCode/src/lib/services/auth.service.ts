/**
 * Auth Service using Supabase Auth
 * Uses Supabase Auth for authentication with custom user metadata in public.users table
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../../config/env.js";
import { getUserById, type User } from "../database/users.db.js";
import {
  DuplicateUserError,
  InvalidCredentialsError,
} from "../errors/app.errors.js";
import type { CreateUserInput, LoginInput } from "../schemas/user.js";

export type AuthResult = {
  user: Omit<User, "password_hash">;
  session?: {
    access_token: string;
    refresh_token: string;
  };
};

export type SessionUser = {
  id: string;
  email: string;
  display_name: string;
  role: User["role"];
  team_id: string | null;
  total_points: number;
  avatar_url: string | null;
};

export class AuthService {
  constructor(private client: SupabaseClient) {}

  // Cached service-role client (singleton pattern)
  private static serviceRoleClient: SupabaseClient | null = null;

  /**
   * Get service role client for admin operations
   * Returns a cached singleton instance to avoid recreating on every call
   */
  private getServiceRoleClient(): SupabaseClient {
    // Return cached client if it exists
    if (AuthService.serviceRoleClient) {
      return AuthService.serviceRoleClient;
    }

    // Validate environment variables
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        "Service role key required for user management operations",
      );
    }

    // Create and cache the service-role client
    AuthService.serviceRoleClient = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    return AuthService.serviceRoleClient;
  }

  /**
   * Register a new user using Supabase Auth
   * Creates auth user and syncs to public.users table
   */
  async register(input: CreateUserInput): Promise<AuthResult> {
    // Check if user already exists
    const { data: existingUser } = await this.client
      .from("users")
      .select("id, email")
      .eq("email", input.email)
      .single();

    if (existingUser) {
      throw new DuplicateUserError("User with this email already exists");
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await this.client.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          display_name: input.display_name,
          role: input.role ?? "member",
        },
      },
    });

    // Detect duplicate registration by checking response data structure
    // When signUp resolves without error but data.user.identities is empty,
    // it means the email is already registered
    if (
      !authError &&
      authData.user &&
      (!authData.user.identities || authData.user.identities.length === 0)
    ) {
      throw new DuplicateUserError("User with this email already exists");
    }

    if (authError) {
      // Map other Supabase Auth errors
      throw new Error(`Registration failed: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error("Registration failed: No user returned");
    }

    // Create corresponding record in public.users table with auth.users.id
    const serviceClient = this.getServiceRoleClient();
    const { data: newUser, error: userError } = await serviceClient
      .from("users")
      .insert({
        id: authData.user.id, // Use auth.users.id
        email: input.email,
        password_hash: "", // Not used with Supabase Auth
        display_name: input.display_name,
        role: input.role ?? "member",
        team_id: input.team_id ?? null,
        avatar_url: input.avatar_url ?? null,
      })
      .select()
      .single();

    if (userError || !newUser) {
      // Cleanup: delete auth user if we can't create public.users record
      try {
        const adminClient = this.getServiceRoleClient();
        await adminClient.auth.admin.deleteUser(authData.user.id);
      } catch (cleanupError) {
        // Log but don't throw - original error is more important
        console.error("Failed to cleanup auth user:", cleanupError);
      }
      throw new Error(`Failed to create user profile: ${userError?.message}`);
    }

    const { password_hash: _, ...userWithoutPassword } = newUser as User;

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
   * Login using Supabase Auth
   */
  async login(input: LoginInput): Promise<AuthResult> {
    const { data: authData, error: authError } =
      await this.client.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });

    if (authError || !authData.user) {
      throw new InvalidCredentialsError("Invalid email or password");
    }

    // Get user from public.users table
    let user = await getUserById(this.client, authData.user.id);
    if (!user) {
      // User exists in auth but not in public.users - create profile
      // This can happen if user was created directly in auth or profile was deleted
      const serviceClient = this.getServiceRoleClient();
      const { data: newUser, error: userError } = await serviceClient
        .from("users")
        .insert({
          id: authData.user.id,
          email: authData.user.email ?? input.email,
          password_hash: "", // Not used with Supabase Auth
          display_name:
            authData.user.user_metadata?.display_name ??
            authData.user.email?.split("@")[0] ??
            "User",
          role: (authData.user.user_metadata?.role as User["role"]) ?? "member",
          team_id: authData.user.user_metadata?.team_id ?? null,
          avatar_url: authData.user.user_metadata?.avatar_url ?? null,
        })
        .select()
        .single();

      if (userError || !newUser) {
        throw new Error(
          `User profile not found and failed to create: ${userError?.message}`,
        );
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
