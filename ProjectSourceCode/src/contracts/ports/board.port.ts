/**
 * Board Port - Interface contract for board services
 */

import type {
  Board,
  CreateBoardInput,
  UpdateBoardInput,
} from "../types/index.js";

export interface IBoardService {
  /**
   * Get board by ID
   */
  getById(id: string): Promise<Board | null>;

  /**
   * Get all boards for a team
   */
  getByTeam(teamId: string): Promise<Board[]>;

  /**
   * Get all boards accessible to a user (via their team)
   */
  getByUser(userId: string): Promise<Board[]>;

  /**
   * Create a new board
   */
  create(input: CreateBoardInput): Promise<Board>;

  /**
   * Update board
   */
  update(input: UpdateBoardInput): Promise<Board>;

  /**
   * Delete board
   */
  delete(id: string): Promise<void>;
}
