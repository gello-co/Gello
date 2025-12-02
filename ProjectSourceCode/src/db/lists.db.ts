import type { SupabaseClient } from "@supabase/supabase-js";
import { ValidationError } from "../errors/ValidationError.js";

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
  userId?: string, // Add optional user_id parameter
): Promise<void> {
  // Validate input: must have at least one list position
  if (listPositions.length === 0) {
    throw new ValidationError("At least one list position is required");
  }

  // Extract all list IDs from the input
  const inputIds = listPositions.map((lp) => lp.id);

  // Query the lists table to verify all IDs belong to the board
  const { data: existingLists, error: queryError } = await client
    .from("lists")
    .select("id")
    .eq("board_id", boardId)
    .in("id", inputIds);

  if (queryError) {
    throw new Error(`Failed to validate list IDs: ${queryError.message}`);
  }

  // Collect existing IDs
  const existingIds = new Set((existingLists ?? []).map((list) => list.id));

  // Check if all input IDs exist and belong to the board
  const missingIds = inputIds.filter((id) => !existingIds.has(id));

  if (missingIds.length > 0) {
    throw new ValidationError(
      `Invalid or missing list IDs that do not belong to board ${boardId}: ${missingIds.join(", ")}`,
    );
  }

  // Verify counts match
  if (existingIds.size !== inputIds.length) {
    // This should not happen if the above check passed, but double-check for duplicates
    const uniqueInputIds = new Set(inputIds);
    if (uniqueInputIds.size !== inputIds.length) {
      throw new ValidationError("Duplicate list IDs found in input");
    }
    throw new ValidationError(
      `Expected ${inputIds.length} lists but found ${existingIds.size} matching the board`,
    );
  }

  // Prepare the JSONB array for the RPC call
  const listPositionsJson = listPositions.map((lp) => ({
    id: lp.id,
    position: lp.position,
  }));

  // Call the RPC function for atomic update
  // Pass user_id if provided (workaround for Supabase local session validation issues)
  const { data: updatedCount, error: rpcError } = await client.rpc(
    "reorder_lists",
    {
      p_board_id: boardId,
      p_list_positions: listPositionsJson,
      p_user_id: userId ?? null, // Pass user_id, null will fallback to auth.uid()
    },
  );

  if (rpcError) {
    throw new Error(`Failed to reorder lists via RPC: ${rpcError.message}`);
  }

  // Verify the number of rows updated matches the input length
  if (updatedCount !== listPositions.length) {
    throw new Error(
      `Expected to update ${listPositions.length} lists, but RPC returned ${updatedCount} updated rows`,
    );
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
