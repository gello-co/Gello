import type { SupabaseClient } from "@supabase/supabase-js";

export type Team = {
  id: string;
  name: string;
  created_at: string;
};

export type CreateTeamInput = {
  name: string;
};

export type UpdateTeamInput = {
  id: string;
  name?: string;
};

export async function getTeamById(
  client: SupabaseClient,
  id: string,
): Promise<Team | null> {
  const { data, error } = await client
    .from("teams")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to get team: ${error.message}`);
  }

  return data as Team;
}

export async function getAllTeams(client: SupabaseClient): Promise<Team[]> {
  const { data, error } = await client.from("teams").select("*").order("name");

  if (error) {
    throw new Error(`Failed to get teams: ${error.message}`);
  }

  return (data ?? []) as Team[];
}

export async function createTeam(
  client: SupabaseClient,
  input: CreateTeamInput,
): Promise<Team> {
  const { data, error } = await client
    .from("teams")
    .insert({
      name: input.name,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create team: ${error.message}`);
  }

  return data as Team;
}

export async function updateTeam(
  client: SupabaseClient,
  input: UpdateTeamInput,
): Promise<Team> {
  const { id, ...updates } = input;

  const { data, error } = await client
    .from("teams")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update team: ${error.message}`);
  }

  return data as Team;
}

export async function deleteTeam(
  client: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await client.from("teams").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete team: ${error.message}`);
  }
}
