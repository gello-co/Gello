import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as boardsDb from "../../../ProjectSourceCode/src/lib/database/boards.db.js";
import { BoardService } from "../../../ProjectSourceCode/src/lib/services/board.service.js";

vi.mock("../../../ProjectSourceCode/src/lib/database/boards.db.js");

describe("BoardService", () => {
  let service: BoardService;
  let mockClient: SupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as SupabaseClient;
    service = new BoardService(mockClient);
  });

  describe("getBoard", () => {
    it("should get board by id", async () => {
      const mockBoard = { id: "board-1", name: "Test Board" };
      vi.mocked(boardsDb.getBoardById).mockResolvedValue(mockBoard as any);

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
      vi.mocked(boardsDb.getBoardsByTeam).mockResolvedValue(mockBoards as any);

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
      vi.mocked(boardsDb.createBoard).mockResolvedValue(mockBoard as any);

      const result = await service.createBoard(input);

      expect(boardsDb.createBoard).toHaveBeenCalledWith(mockClient, input);
      expect(result).toEqual(mockBoard);
    });
  });

  describe("updateBoard", () => {
    it("should update a board", async () => {
      const input = { id: "board-1", name: "Updated Board" };
      const mockBoard = { id: "board-1", name: "Updated Board" };
      vi.mocked(boardsDb.updateBoard).mockResolvedValue(mockBoard as any);

      const result = await service.updateBoard(input);

      expect(boardsDb.updateBoard).toHaveBeenCalledWith(mockClient, input);
      expect(result).toEqual(mockBoard);
    });
  });

  describe("deleteBoard", () => {
    it("should delete a board", async () => {
      vi.mocked(boardsDb.deleteBoard).mockResolvedValue(undefined);

      await service.deleteBoard("board-1");

      expect(boardsDb.deleteBoard).toHaveBeenCalledWith(mockClient, "board-1");
    });
  });
});
