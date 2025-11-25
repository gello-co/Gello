import { beforeEach, describe, expect, it } from "bun:test";
import { db } from "@/lib/database/drizzle";
import {
  boards,
  lists,
  pointsHistory,
  tasks,
  teams,
  users,
} from "@/lib/database/schema";
import { ListService } from "@/lib/services/list.service";
import { getSupabaseClient } from "@/lib/supabase";

describe("ListService Integration", () => {
  let service: ListService;
  let testTeamId: string;
  let testBoardId: string;

  beforeEach(async () => {
    const supabase = getSupabaseClient();
    service = new ListService(supabase);

    // Cleanup in correct order (respect foreign keys)
    await db.delete(pointsHistory);
    await db.delete(tasks);
    await db.delete(lists);
    await db.delete(boards);
    await db.delete(users);
    await db.delete(teams);

    // Setup hierarchy
    const team = await db
      .insert(teams)
      .values({ name: "Test Team" })
      .returning();
    testTeamId = team[0]?.id ?? "";

    const board = await db
      .insert(boards)
      .values({
        name: "Test Board",
        teamId: testTeamId,
      })
      .returning();
    testBoardId = board[0]?.id ?? "";
  });

  // Note: Don't close DB connection here - shared singleton is cleaned up by process exit

  describe("getList", () => {
    it("should get list by id", async () => {
      const created = await service.createList({
        board_id: testBoardId,
        name: "Test List",
        position: 0,
      });

      const result = await service.getList(created.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(created.id);
      expect(result?.name).toBe("Test List");
      expect(result?.board_id).toBe(testBoardId);
    });

    it("should return null for non-existent list", async () => {
      const result = await service.getList(
        "00000000-0000-0000-0000-000000000000",
      );
      expect(result).toBeNull();
    });
  });

  describe("getListsByBoard", () => {
    it("should get lists by board ordered by position", async () => {
      await service.createList({
        board_id: testBoardId,
        name: "List 2",
        position: 1,
      });
      await service.createList({
        board_id: testBoardId,
        name: "List 1",
        position: 0,
      });

      const results = await service.getListsByBoard(testBoardId);

      expect(results.length).toBe(2);
      expect(results[0]?.name).toBe("List 1");
      expect(results[1]?.name).toBe("List 2");
    });

    it("should return empty array for board with no lists", async () => {
      const results = await service.getListsByBoard(testBoardId);
      expect(results).toEqual([]);
    });
  });

  describe("createList", () => {
    it("should create a list", async () => {
      const result = await service.createList({
        board_id: testBoardId,
        name: "New List",
        position: 0,
      });

      expect(result.id).toBeDefined();
      expect(result.name).toBe("New List");
      expect(result.board_id).toBe(testBoardId);
      expect(result.position).toBe(0);
      expect(result.created_at).toBeDefined();
    });
  });

  describe("updateList", () => {
    it("should update a list", async () => {
      const created = await service.createList({
        board_id: testBoardId,
        name: "Original Name",
        position: 0,
      });

      const updated = await service.updateList({
        id: created.id,
        name: "Updated Name",
        position: 5,
      });

      expect(updated.id).toBe(created.id);
      expect(updated.name).toBe("Updated Name");
      expect(updated.position).toBe(5);
    });
  });

  describe("deleteList", () => {
    it("should delete a list", async () => {
      const created = await service.createList({
        board_id: testBoardId,
        name: "List to Delete",
        position: 0,
      });

      await service.deleteList(created.id);

      const fetched = await service.getList(created.id);
      expect(fetched).toBeNull();
    });
  });
});
