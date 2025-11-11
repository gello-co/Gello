import type { SupabaseClient } from "@supabase/supabase-js";

export type Board = {
  id: string;
  name: string;
  description: string | null;
  team_id: string;
  created_by: string | null;
  created_at: string;
};

export type CreateBoardInput = {
  name: string;
  description?: string | null;
  team_id: string;
  created_by?: string | null;
};

export type UpdateBoardInput = {
  id: string;
  name?: string;
  description?: string | null;
  team_id?: string;
};

export async function getBoardById(
  client: SupabaseClient,
  id: string,
): Promise<Board | null> {
  const { data, error } = await client
    .from("boards")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to get board: ${error.message}`);
  }

  return data as Board;
}

export async function getBoardsByTeam(
  client: SupabaseClient,
  teamId: string,
): Promise<Board[]> {
  const { data, error } = await client
    .from("boards")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to get boards by team: ${error.message}`);
  }

  return (data ?? []) as Board[];
}

export async function createBoard(
  client: SupabaseClient,
  input: CreateBoardInput,
): Promise<Board> {
  const { data, error } = await client
    .from("boards")
    .insert({
      name: input.name,
      description: input.description ?? null,
      team_id: input.team_id,
      created_by: input.created_by ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create board: ${error.message}`);
  }

  return data as Board;
}

export async function updateBoard(
  client: SupabaseClient,
  input: UpdateBoardInput,
): Promise<Board> {
  const { id, ...updates } = input;

  const { data, error } = await client
    .from("boards")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update board: ${error.message}`);
  }

  return data as Board;
}

export async function deleteBoard(
  client: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await client.from("boards").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete board: ${error.message}`);
  }
}
