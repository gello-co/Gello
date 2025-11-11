/**
 * Auth Service using Supabase Auth
 * Uses Supabase Auth for authentication with custom user metadata in public.users table
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../../config/env.js";
import { getUserById, type User } from "../database/users.db.js";
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

  /**
   * Get service role client for admin operations
   */
  private getServiceRoleClient(): SupabaseClient {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        "Service role key required for user management operations",
      );
    }
    return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
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
      throw new Error("User with this email already exists");
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

    if (authError) {
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
      throw new Error("Invalid email or password");
    }

    // Get user from public.users table
    const user = await getUserById(this.client, authData.user.id);
    if (!user) {
      throw new Error("User profile not found");
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
