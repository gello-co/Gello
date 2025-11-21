import type { SupabaseClient } from "@supabase/supabase-js";

export type UserRole = "admin" | "manager" | "member";

export type User = {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  role: UserRole;
  team_id: string | null;
  total_points: number;
  avatar_url: string | null;
  created_at: string;
};

export type CreateUserInput = {
  email: string;
  password_hash: string;
  display_name: string;
  role?: UserRole;
  team_id?: string | null;
  avatar_url?: string | null;
};

export type UpdateUserInput = {
  id: string;
  email?: string;
  password_hash?: string;
  display_name?: string;
  role?: UserRole;
  team_id?: string | null;
  total_points?: number;
  avatar_url?: string | null;
};

export async function getUserById(
  client: SupabaseClient,
  id: string,
): Promise<User | null> {
  const { data, error } = await client
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to get user: ${error.message}`);
  }

  return data as User;
}

export async function getUserByEmail(
  client: SupabaseClient,
  email: string,
): Promise<User | null> {
  const { data, error } = await client
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to get user by email: ${error.message}`);
  }

  return data as User;
}

export async function getUsersByTeam(
  client: SupabaseClient,
  teamId: string,
): Promise<User[]> {
  const { data, error } = await client
    .from("users")
    .select("*")
    .eq("team_id", teamId)
    .order("display_name");

  if (error) {
    throw new Error(`Failed to get users by team: ${error.message}`);
  }

  return (data ?? []) as User[];
}

export async function createUser(
  client: SupabaseClient,
  input: CreateUserInput,
): Promise<User> {
  const { data, error } = await client
    .from("users")
    .insert({
      email: input.email,
      password_hash: input.password_hash,
      display_name: input.display_name,
      role: input.role ?? "member",
      team_id: input.team_id ?? null,
      avatar_url: input.avatar_url ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }

  return data as User;
}

export async function updateUser(
  client: SupabaseClient,
  input: UpdateUserInput,
): Promise<User> {
  const { id, ...updates } = input;

  const { data, error } = await client
    .from("users")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update user: ${error.message}`);
  }

  return data as User;
}

export async function deleteUser(
  client: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await client.from("users").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete user: ${error.message}`);
  }
}
