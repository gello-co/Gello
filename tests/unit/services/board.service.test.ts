import { beforeEach, describe, expect, it } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { db } from "@/lib/database/drizzle";
import {
  boards,
  lists,
  pointsHistory,
  tasks,
  teams,
  users,
} from "@/lib/database/schema";
import { BoardService } from "@/lib/services/board.service";

describe.skip("BoardService Integration (legacy)", () => {
  let service: BoardService;
  let testTeamId: string;

  beforeEach(async () => {
    const supabase = {} as SupabaseClient;
    service = new BoardService(supabase);

    // Cleanup in correct order (respect foreign keys)
    await db.delete(pointsHistory);
    await db.delete(tasks);
    await db.delete(lists);
    await db.delete(boards);
    await db.delete(users);
    await db.delete(teams);

    // Setup test team
    const team = await db
      .insert(teams)
      .values({ name: "Test Team" })
      .returning();
    testTeamId = team[0]?.id ?? "";
  });

  // Note: Don't close DB connection here - shared singleton is cleaned up by process exit

  describe("getBoard", () => {
    it("should get board by id", async () => {
      // Create a board first
      const created = await service.createBoard({
        name: "Test Board",
        team_id: testTeamId,
      });

      const result = await service.getBoard(created.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(created.id);
      expect(result?.name).toBe("Test Board");
      expect(result?.team_id).toBe(testTeamId);
    });

    it("should return null for non-existent board", async () => {
      const result = await service.getBoard(
        "00000000-0000-0000-0000-000000000000",
      );
      expect(result).toBeNull();
    });
  });

  describe("getBoardsByTeam", () => {
    it("should get boards by team", async () => {
      // Create multiple boards
      await service.createBoard({ name: "Board 1", team_id: testTeamId });
      await service.createBoard({ name: "Board 2", team_id: testTeamId });

      const results = await service.getBoardsByTeam(testTeamId);

      expect(results.length).toBe(2);
      expect(results.map((b) => b.name).sort()).toEqual(["Board 1", "Board 2"]);
    });

    it("should return empty array for team with no boards", async () => {
      const results = await service.getBoardsByTeam(testTeamId);
      expect(results).toEqual([]);
    });
  });

  describe("createBoard", () => {
    it("should create a board", async () => {
      const result = await service.createBoard({
        name: "New Board",
        team_id: testTeamId,
        description: "Test description",
      });

      expect(result.id).toBeDefined();
      expect(result.name).toBe("New Board");
      expect(result.team_id).toBe(testTeamId);
      expect(result.description).toBe("Test description");
      expect(result.created_at).toBeDefined();
    });
  });

  describe("updateBoard", () => {
    it("should update a board", async () => {
      const created = await service.createBoard({
        name: "Original Name",
        team_id: testTeamId,
      });

      const updated = await service.updateBoard({
        id: created.id,
        name: "Updated Name",
        description: "New description",
      });

      expect(updated.id).toBe(created.id);
      expect(updated.name).toBe("Updated Name");
      expect(updated.description).toBe("New description");
    });
  });

  describe("deleteBoard", () => {
    it("should delete a board", async () => {
      const created = await service.createBoard({
        name: "Board to Delete",
        team_id: testTeamId,
      });

      await service.deleteBoard(created.id);

      const fetched = await service.getBoard(created.id);
      expect(fetched).toBeNull();
    });
  });
});
