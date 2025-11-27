import type { SupabaseClient } from "@supabase/supabase-js";
import { ResourceNotFoundError } from "../errors/app.errors.js";
import { logger } from "../logger.js";
import type { CreateBoardInput, UpdateBoardInput } from "../schemas/board.js";

export type Board = {
  id: string;
  name: string;
  description: string | null;
  team_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
};

export class BoardService {
  constructor(private supabase: SupabaseClient) {}

  async getBoard(id: string): Promise<Board | null> {
    try {
      const { data, error } = await this.supabase
        .from("boards")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null; // Not found
        throw error;
      }

      return data;
    } catch (error) {
      logger.error({ error, id }, "Failed to get board by ID");
      throw error;
    }
  }

  async getBoardsByTeam(teamId: string): Promise<Board[]> {
    try {
      const { data, error } = await this.supabase
        .from("boards")
        .select("*")
        .eq("team_id", teamId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error({ error, teamId }, "Failed to get boards by team");
      throw error;
    }
  }

  async getBoardsForUser(userId: string): Promise<Board[]> {
    try {
      // Get user's team_id
      const { data: user, error: userError } = await this.supabase
        .from("users")
        .select("team_id")
        .eq("id", userId)
        .single();

      if (userError || !user || !user.team_id) {
        return [];
      }

      // Get boards for the user's team
      return this.getBoardsByTeam(user.team_id);
    } catch (error) {
      logger.error({ error, userId }, "Failed to get boards for user");
      throw error;
    }
  }

  async createBoard(input: CreateBoardInput): Promise<Board> {
    try {
      const { data, error } = await this.supabase
        .from("boards")
        .insert({
          name: input.name,
          description: input.description ?? null,
          team_id: input.team_id,
          created_by: input.created_by ?? null,
        })
        .select()
        .single();

      if (error || !data) {
        throw error || new Error("Failed to create board: No data returned");
      }

      return data;
    } catch (error) {
      logger.error({ error, input }, "Failed to create board");
      throw error;
    }
  }

  async updateBoard(input: UpdateBoardInput & { id: string }): Promise<Board> {
    try {
      const { id, ...updates } = input;

      const updateData: Record<string, string | number | boolean | null> = {
        updated_at: new Date().toISOString(),
      };
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined)
        updateData.description = updates.description;
      if (updates.team_id !== undefined) updateData.team_id = updates.team_id;

      const { data, error } = await this.supabase
        .from("boards")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          throw new ResourceNotFoundError(`Board not found: ${id}`);
        }
        throw error;
      }

      if (!data) {
        throw new ResourceNotFoundError(`Board not found: ${id}`);
      }

      return data;
    } catch (error) {
      logger.error({ error, input }, "Failed to update board");
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw error;
    }
  }

  async deleteBoard(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("boards")
        .delete()
        .eq("id", id)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          throw new ResourceNotFoundError(`Board not found: ${id}`);
        }
        throw error;
      }
    } catch (error) {
      logger.error({ error, id }, "Failed to delete board");
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw error;
    }
  }
}
