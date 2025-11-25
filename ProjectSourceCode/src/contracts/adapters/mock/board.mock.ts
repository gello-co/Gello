/**
 * Mock Board Adapter - In-memory board data for UI development
 */

import {
  getMockBoardsByTeam,
  MOCK_BOARDS,
  MOCK_USERS,
} from "../../fixtures/index.js";
import type { IBoardService } from "../../ports/board.port.js";
import type {
  Board,
  CreateBoardInput,
  UpdateBoardInput,
} from "../../types/index.js";

export class MockBoardService implements IBoardService {
  private boards: Map<string, Board> = new Map(
    MOCK_BOARDS.map((b) => [b.id, { ...b }]),
  );

  async getById(id: string): Promise<Board | null> {
    return this.boards.get(id) ?? null;
  }

  async getByTeam(teamId: string): Promise<Board[]> {
    const results: Board[] = [];
    for (const board of this.boards.values()) {
      if (board.team_id === teamId) results.push(board);
    }
    if (results.length === 0) {
      return getMockBoardsByTeam(teamId);
    }
    return results.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  async getByUser(userId: string): Promise<Board[]> {
    // Find user's team
    const user = MOCK_USERS.find((u) => u.id === userId);
    if (!user?.team_id) {
      return [];
    }
    return this.getByTeam(user.team_id);
  }

  async create(input: CreateBoardInput): Promise<Board> {
    const board: Board = {
      id: `board-mock-${Date.now()}`,
      name: input.name,
      description: input.description ?? null,
      team_id: input.team_id,
      created_by: input.created_by ?? null,
      created_at: new Date().toISOString(),
    };
    this.boards.set(board.id, board);
    return board;
  }

  async update(input: UpdateBoardInput): Promise<Board> {
    const existing = this.boards.get(input.id);
    if (!existing) {
      throw new Error(`Board not found: ${input.id}`);
    }

    const updated: Board = {
      ...existing,
      ...input,
    };
    this.boards.set(input.id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    if (!this.boards.has(id)) {
      throw new Error(`Board not found: ${id}`);
    }
    this.boards.delete(id);
  }

  /**
   * Reset to fixture data (for tests)
   */
  reset(): void {
    this.boards = new Map(MOCK_BOARDS.map((b) => [b.id, { ...b }]));
  }
}

export function createMockBoardService(): MockBoardService {
  return new MockBoardService();
}
