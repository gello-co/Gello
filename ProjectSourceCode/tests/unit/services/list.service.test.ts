import { beforeEach, describe, expect, it, vi } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as listsDb from "../../../ProjectSourceCode/src/lib/database/lists.db.js";
import { ListService } from "../../../ProjectSourceCode/src/lib/services/list.service.js";
import { mockFn } from "../../setup/helpers/mock.js";

vi.mock("../../../ProjectSourceCode/src/lib/database/lists.db.js", () => ({
  getListById: vi.fn(),
  getListsByBoard: vi.fn(),
  createList: vi.fn(),
  updateList: vi.fn(),
  deleteList: vi.fn(),
  reorderLists: vi.fn(),
}));

describe("ListService (bun)", () => {
  let service: ListService;
  let mockClient: SupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as SupabaseClient;
    service = new ListService(mockClient);
  });

  describe("getList", () => {
    it("should get list by id", async () => {
      const mockList = {
        id: "list-1",
        board_id: "board-1",
        name: "Test List",
        position: 0,
        created_at: new Date().toISOString(),
      };
      mockFn(listsDb.getListById).mockResolvedValue(mockList);

      const result = await service.getList("list-1");

      expect(listsDb.getListById).toHaveBeenCalledWith(mockClient, "list-1");
      expect(result).toEqual(mockList);
    });
  });

  describe("getListsByBoard", () => {
    it("should get lists by board", async () => {
      const mockLists = [
        {
          id: "list-1",
          board_id: "board-1",
          name: "List 1",
          position: 0,
          created_at: new Date().toISOString(),
        },
        {
          id: "list-2",
          board_id: "board-1",
          name: "List 2",
          position: 1,
          created_at: new Date().toISOString(),
        },
      ];
      mockFn(listsDb.getListsByBoard).mockResolvedValue(mockLists);

      const result = await service.getListsByBoard("board-1");

      expect(listsDb.getListsByBoard).toHaveBeenCalledWith(
        mockClient,
        "board-1",
      );
      expect(result).toEqual(mockLists);
    });
  });

  describe("createList", () => {
    it("should create a list", async () => {
      const input = { name: "New List", board_id: "board-1", position: 0 };
      const mockList = {
        id: "list-1",
        ...input,
        created_at: new Date().toISOString(),
      };
      mockFn(listsDb.createList).mockResolvedValue(mockList);

      const result = await service.createList(input);

      expect(listsDb.createList).toHaveBeenCalledWith(mockClient, input);
      expect(result).toEqual(mockList);
    });
  });

  describe("updateList", () => {
    it("should update a list", async () => {
      const input = { id: "list-1", name: "Updated List" };
      const mockList = {
        id: "list-1",
        board_id: "board-1",
        name: "Updated List",
        position: 0,
        created_at: new Date().toISOString(),
      };
      mockFn(listsDb.updateList).mockResolvedValue(mockList);

      const result = await service.updateList(input);

      expect(listsDb.updateList).toHaveBeenCalledWith(mockClient, input);
      expect(result).toEqual(mockList);
    });
  });

  describe("reorderLists", () => {
    it("should reorder lists", async () => {
      const input = {
        board_id: "board-1",
        list_positions: [
          { id: "list-1", position: 0 },
          { id: "list-2", position: 1 },
        ],
      };
      mockFn(listsDb.reorderLists).mockResolvedValue(undefined);

      await service.reorderLists(input);

      expect(listsDb.reorderLists).toHaveBeenCalledWith(
        mockClient,
        input.board_id,
        input.list_positions,
        undefined,
      );
    });
  });

  describe("deleteList", () => {
    it("should delete a list", async () => {
      mockFn(listsDb.deleteList).mockResolvedValue(undefined);

      await service.deleteList("list-1");

      expect(listsDb.deleteList).toHaveBeenCalledWith(mockClient, "list-1");
    });
  });
});
