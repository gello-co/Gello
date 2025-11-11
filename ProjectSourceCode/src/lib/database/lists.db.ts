import type { SupabaseClient } from "@supabase/supabase-js";

export type List = {
  id: string;
  board_id: string;
  name: string;
  position: number;
  created_at: string;
};

export type CreateListInput = {
  board_id: string;
  name: string;
  position?: number;
};

export type UpdateListInput = {
  id: string;
  name?: string;
  position?: number;
};

export async function getListById(
  client: SupabaseClient,
  id: string,
): Promise<List | null> {
  const { data, error } = await client
    .from("lists")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to get list: ${error.message}`);
  }

  return data as List;
}

export async function getListsByBoard(
  client: SupabaseClient,
  boardId: string,
): Promise<List[]> {
  const { data, error } = await client
    .from("lists")
    .select("*")
    .eq("board_id", boardId)
    .order("position", { ascending: true });

  if (error) {
    throw new Error(`Failed to get lists by board: ${error.message}`);
  }

  return (data ?? []) as List[];
}

export async function createList(
  client: SupabaseClient,
  input: CreateListInput,
): Promise<List> {
  const { data, error } = await client
    .from("lists")
    .insert({
      board_id: input.board_id,
      name: input.name,
      position: input.position ?? 0,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create list: ${error.message}`);
  }

  return data as List;
}

export async function updateList(
  client: SupabaseClient,
  input: UpdateListInput,
): Promise<List> {
  const { id, ...updates } = input;

  const { data, error } = await client
    .from("lists")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update list: ${error.message}`);
  }

  return data as List;
}

export async function reorderLists(
  client: SupabaseClient,
  boardId: string,
  listPositions: Array<{ id: string; position: number }>,
): Promise<void> {
  const updates = listPositions.map(({ id, position }) =>
    client
      .from("lists")
      .update({ position })
      .eq("id", id)
      .eq("board_id", boardId),
  );

  const results = await Promise.all(updates);

  for (const result of results) {
    if (result.error) {
      throw new Error(`Failed to reorder lists: ${result.error.message}`);
    }
  }
}

export async function deleteList(
  client: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await client.from("lists").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete list: ${error.message}`);
  }
}
