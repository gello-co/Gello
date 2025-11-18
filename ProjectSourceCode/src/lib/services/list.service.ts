import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createList,
  deleteList,
  getListById,
  getListsByBoard,
  type List,
  reorderLists,
  updateList,
} from "../database/lists.db.js";
import type {
  CreateListInput,
  ReorderListsInput,
  UpdateListInput,
} from "../schemas/list.js";

export class ListService {
  constructor(private client: SupabaseClient) {}

  async getList(id: string): Promise<List | null> {
    return getListById(this.client, id);
  }

  async getListsByBoard(boardId: string): Promise<List[]> {
    return getListsByBoard(this.client, boardId);
  }

  async createList(input: CreateListInput): Promise<List> {
    return createList(this.client, input);
  }

  async updateList(input: UpdateListInput): Promise<List> {
    return updateList(this.client, input);
  }

  async reorderLists(input: ReorderListsInput, userId?: string): Promise<void> {
    return reorderLists(this.client, input.board_id, input.list_positions, userId);
  }

  async deleteList(id: string): Promise<void> {
    return deleteList(this.client, id);
  }
}
