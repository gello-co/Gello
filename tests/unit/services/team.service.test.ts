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
import { TeamService } from "@/lib/services/team.service";

describe.skip("TeamService Integration (legacy)", () => {
  let service: TeamService;

  beforeEach(async () => {
    const supabase = {} as SupabaseClient;
    service = new TeamService(supabase);

    // Cleanup in correct order (respect foreign keys)
    await db.delete(pointsHistory);
    await db.delete(tasks);
    await db.delete(lists);
    await db.delete(boards);
    await db.delete(users);
    await db.delete(teams);
  });

  // Note: Don't close DB connection here - shared singleton is cleaned up by process exit

  describe("getTeam", () => {
    it("should get team by id", async () => {
      const created = await service.createTeam({ name: "Test Team" });

      const result = await service.getTeam(created.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(created.id);
      expect(result?.name).toBe("Test Team");
    });

    it("should return null for non-existent team", async () => {
      const result = await service.getTeam(
        "00000000-0000-0000-0000-000000000000",
      );
      expect(result).toBeNull();
    });
  });

  describe("getAllTeams", () => {
    it("should get all teams ordered by name", async () => {
      await service.createTeam({ name: "Zebra Team" });
      await service.createTeam({ name: "Alpha Team" });

      const results = await service.getAllTeams();

      expect(results.length).toBe(2);
      expect(results[0]?.name).toBe("Alpha Team");
      expect(results[1]?.name).toBe("Zebra Team");
    });

    it("should return empty array when no teams exist", async () => {
      const results = await service.getAllTeams();
      expect(results).toEqual([]);
    });
  });

  describe("createTeam", () => {
    it("should create a team", async () => {
      const result = await service.createTeam({ name: "New Team" });

      expect(result.id).toBeDefined();
      expect(result.name).toBe("New Team");
      expect(result.created_at).toBeDefined();
    });
  });

  describe("updateTeam", () => {
    it("should update a team", async () => {
      const created = await service.createTeam({ name: "Original Name" });

      const updated = await service.updateTeam({
        id: created.id,
        name: "Updated Name",
      });

      expect(updated.id).toBe(created.id);
      expect(updated.name).toBe("Updated Name");
    });
  });

  describe("deleteTeam", () => {
    it("should delete a team", async () => {
      const created = await service.createTeam({ name: "Team to Delete" });

      await service.deleteTeam(created.id);

      const fetched = await service.getTeam(created.id);
      expect(fetched).toBeNull();
    });
  });

  describe("team members", () => {
    it("should add and get team members", async () => {
      const team = await service.createTeam({ name: "Test Team" });

      // Create a test user directly in database
      const userResult = await db
        .insert(users)
        .values({
          email: "test@example.com",
          displayName: "Test User",
          passwordHash: "hashed_test_password",
          role: "member",
        })
        .returning();

      const userId = userResult[0]?.id ?? "";

      // Add member to team
      const addedMember = await service.addMemberToTeam(userId, team.id);
      expect(addedMember.team_id).toBe(team.id);

      // Get team members
      const members = await service.getTeamMembers(team.id);
      expect(members.length).toBe(1);
      expect(members[0]?.id).toBe(userId);
    });

    it("should remove member from team", async () => {
      const team = await service.createTeam({ name: "Test Team" });

      // Create and add a test user
      const userResult = await db
        .insert(users)
        .values({
          email: "test@example.com",
          displayName: "Test User",
          passwordHash: "hashed_test_password",
          role: "member",
          teamId: team.id,
        })
        .returning();

      const userId = userResult[0]?.id ?? "";

      // Remove from team
      const removed = await service.removeMemberFromTeam(userId);
      expect(removed.team_id).toBeNull();

      // Verify member count
      const members = await service.getTeamMembers(team.id);
      expect(members.length).toBe(0);
    });
  });
});
