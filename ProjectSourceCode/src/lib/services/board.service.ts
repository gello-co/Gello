import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type Board,
  createBoard,
  deleteBoard,
  getBoardById,
  getBoardsByTeam,
  getBoardsByUser,
  updateBoard,
} from "../database/boards.db.js";
import type { CreateBoardInput, UpdateBoardInput } from "../schemas/board.js";

export class BoardService {
  constructor(private client: SupabaseClient) {}

  async getBoard(id: string): Promise<Board | null> {
    return getBoardById(this.client, id);
  }

  async getBoardsByTeam(teamId: string): Promise<Board[]> {
    return getBoardsByTeam(this.client, teamId);
  }

  async getBoardsForUser(userId: string): Promise<Board[]> {
    return getBoardsByUser(this.client, userId);
  }

  async createBoard(input: CreateBoardInput): Promise<Board> {
    return createBoard(this.client, input);
  }

  async updateBoard(input: UpdateBoardInput): Promise<Board> {
    return updateBoard(this.client, input);
  }

  async deleteBoard(id: string): Promise<void> {
    return deleteBoard(this.client, id);
  }
}
