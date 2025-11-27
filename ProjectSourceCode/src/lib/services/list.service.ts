import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ResourceNotFoundError,
  ValidationError,
} from "../errors/app.errors.js";
import { logger } from "../logger.js";
import type {
  CreateListInput,
  ReorderListsInput,
  UpdateListInput,
} from "../schemas/list.js";

export type List = {
  id: string;
  board_id: string;
  name: string;
  position: number;
  created_at: string;
};

export class ListService {
  constructor(private supabase: SupabaseClient) {}

  async getList(id: string): Promise<List | null> {
    try {
      const { data, error } = await this.supabase
        .from("lists")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }

      return data;
    } catch (error) {
      logger.error({ error, id }, "Failed to get list by ID");
      throw error;
    }
  }

  async getListsByBoard(boardId: string): Promise<List[]> {
    try {
      const { data, error } = await this.supabase
        .from("lists")
        .select("*")
        .eq("board_id", boardId)
        .order("position", { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error({ error, boardId }, "Failed to get lists by board");
      throw error;
    }
  }

  async createList(
    input: CreateListInput & { board_id: string },
  ): Promise<List> {
    try {
      const { data, error } = await this.supabase
        .from("lists")
        .insert({
          board_id: input.board_id,
          name: input.name,
          position: input.position ?? 0,
        })
        .select()
        .single();

      if (error || !data) {
        throw error || new Error("Failed to create list: No data returned");
      }

      return data;
    } catch (error) {
      logger.error({ error, input }, "Failed to create list");
      throw error;
    }
  }

  async updateList(input: UpdateListInput & { id: string }): Promise<List> {
    try {
      const { id, ...updates } = input;

      // Build update object with only valid columns (lists table has no updated_at)
      const updateData: Record<string, unknown> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.position !== undefined)
        updateData.position = updates.position;

      // Skip update if no fields to update
      if (Object.keys(updateData).length === 0) {
        const existing = await this.getList(id);
        if (!existing) {
          throw new ResourceNotFoundError(`List not found: ${id}`);
        }
        return existing;
      }

      const { data, error } = await this.supabase
        .from("lists")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          throw new ResourceNotFoundError(`List not found: ${id}`);
        }
        throw error;
      }

      if (!data) {
        throw new ResourceNotFoundError(`List not found: ${id}`);
      }

      return data;
    } catch (error) {
      logger.error({ error, input }, "Failed to update list");
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw error;
    }
  }

  async reorderLists(input: ReorderListsInput, userId?: string): Promise<void> {
    if (input.list_positions.length === 0) {
      throw new ValidationError("At least one list position is required");
    }
    const inputIds = input.list_positions.map((lp) => lp.id);

    try {
      // Validate that all lists exist and belong to the board
      const { data: existingLists, error } = await this.supabase
        .from("lists")
        .select("id")
        .eq("board_id", input.board_id)
        .in("id", inputIds);

      if (error) throw error;

      const existingIds = new Set((existingLists || []).map((list) => list.id));

      const missingIds = inputIds.filter((id) => !existingIds.has(id));

      if (missingIds.length > 0) {
        throw new ValidationError(
          `Invalid or missing list IDs that do not belong to board ${input.board_id}: ${missingIds.join(", ")}`,
        );
      }

      if (existingIds.size !== inputIds.length) {
        const uniqueInputIds = new Set(inputIds);
        if (uniqueInputIds.size !== inputIds.length) {
          throw new ValidationError("Duplicate list IDs found in input");
        }
        throw new ValidationError(
          `Expected ${inputIds.length} lists but found ${existingIds.size} matching the board`,
        );
      }

      const listPositionsJson = input.list_positions.map((lp) => ({
        id: lp.id,
        position: lp.position,
      }));

      const { data: updatedCount, error: rpcError } = await this.supabase.rpc(
        "reorder_lists",
        {
          p_board_id: input.board_id,
          p_list_positions: listPositionsJson,
          p_user_id: userId ?? null,
        },
      );

      if (rpcError) {
        throw new Error(`Failed to reorder lists via RPC: ${rpcError.message}`);
      }

      if (updatedCount !== input.list_positions.length) {
        throw new Error(
          `Expected to update ${input.list_positions.length} lists, but RPC returned ${updatedCount} updated rows`,
        );
      }
    } catch (error) {
      logger.error({ error, input }, "Failed to reorder lists");
      if (error instanceof ValidationError) {
        throw error;
      }
      throw error;
    }
  }

  async deleteList(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("lists")
        .delete()
        .eq("id", id)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          throw new ResourceNotFoundError(`List not found: ${id}`);
        }
        throw error;
      }
    } catch (error) {
      logger.error({ error, id }, "Failed to delete list");
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw error;
    }
  }
}
