import { beforeEach, describe, expect, it, vi } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Board } from "../../../ProjectSourceCode/src/lib/database/boards.db.js";
import * as boardsDb from "../../../ProjectSourceCode/src/lib/database/boards.db.js";
import { BoardService } from "../../../ProjectSourceCode/src/lib/services/board.service.js";
import { mockFn } from "../../setup/helpers/mock.js";

vi.mock("../../../ProjectSourceCode/src/lib/database/boards.db.js", () => ({
  getBoardById: vi.fn(),
  getBoardsByTeam: vi.fn(),
  createBoard: vi.fn(),
  updateBoard: vi.fn(),
  deleteBoard: vi.fn(),
}));

describe("BoardService (bun)", () => {
  let service: BoardService;
  let mockClient: SupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as SupabaseClient;
    service = new BoardService(mockClient);
  });

  describe("getBoard", () => {
    it("should get board by id", async () => {
      const mockBoard: Board = {
        id: "board-1",
        name: "Test Board",
        description: "Test",
        team_id: "team-1",
        created_by: "user-1",
        created_at: new Date().toISOString(),
      };
      mockFn(boardsDb.getBoardById).mockResolvedValue(mockBoard as any);

      const result = await service.getBoard("board-1");

      expect(boardsDb.getBoardById).toHaveBeenCalledWith(mockClient, "board-1");
      expect(result).toEqual(mockBoard);
    });
  });

  describe("getBoardsByTeam", () => {
    it("should get boards by team", async () => {
      const mockBoards = [
        { id: "board-1", name: "Board 1" },
        { id: "board-2", name: "Board 2" },
      ];
      mockFn(boardsDb.getBoardsByTeam).mockResolvedValue(mockBoards as any);

      const result = await service.getBoardsByTeam("team-1");

      expect(boardsDb.getBoardsByTeam).toHaveBeenCalledWith(
        mockClient,
        "team-1",
      );
      expect(result).toEqual(mockBoards);
    });
  });

  describe("createBoard", () => {
    it("should create a board", async () => {
      const input = { name: "New Board", team_id: "team-1" };
      const mockBoard = { id: "board-1", ...input };
      mockFn(boardsDb.createBoard).mockResolvedValue(mockBoard as any);

      const result = await service.createBoard(input);

      expect(boardsDb.createBoard).toHaveBeenCalledWith(mockClient, input);
      expect(result).toEqual(mockBoard);
    });
  });

  describe("updateBoard", () => {
    it("should update a board", async () => {
      const input = { id: "board-1", name: "Updated Board" };
      const mockBoard = { id: "board-1", name: "Updated Board" };
      mockFn(boardsDb.updateBoard).mockResolvedValue(mockBoard as any);

      const result = await service.updateBoard(input);

      expect(boardsDb.updateBoard).toHaveBeenCalledWith(mockClient, input);
      expect(result).toEqual(mockBoard);
    });
  });

  describe("deleteBoard", () => {
    it("should delete a board", async () => {
      mockFn(boardsDb.deleteBoard).mockResolvedValue(undefined);

      await service.deleteBoard("board-1");

      expect(boardsDb.deleteBoard).toHaveBeenCalledWith(mockClient, "board-1");
    });
  });
});
