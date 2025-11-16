import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as teamsDb from "../../../ProjectSourceCode/src/lib/database/teams.db.js";
import * as usersDb from "../../../ProjectSourceCode/src/lib/database/users.db.js";
import { TeamService } from "../../../ProjectSourceCode/src/lib/services/team.service.js";

vi.mock("../../../ProjectSourceCode/src/lib/database/teams.db.js");
vi.mock("../../../ProjectSourceCode/src/lib/database/users.db.js");

describe("TeamService", () => {
  let service: TeamService;
  let mockClient: SupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as SupabaseClient;
    service = new TeamService(mockClient);
  });

  describe("getTeam", () => {
    it("should get team by id", async () => {
      const mockTeam = { id: "team-1", name: "Test Team" };
      vi.mocked(teamsDb.getTeamById).mockResolvedValue(mockTeam as any);

      const result = await service.getTeam("team-1");

      expect(teamsDb.getTeamById).toHaveBeenCalledWith(mockClient, "team-1");
      expect(result).toEqual(mockTeam);
    });
  });

  describe("getAllTeams", () => {
    it("should get all teams", async () => {
      const mockTeams = [
        { id: "team-1", name: "Team 1" },
        { id: "team-2", name: "Team 2" },
      ];
      vi.mocked(teamsDb.getAllTeams).mockResolvedValue(mockTeams as any);

      const result = await service.getAllTeams();

      expect(teamsDb.getAllTeams).toHaveBeenCalledWith(mockClient);
      expect(result).toEqual(mockTeams);
    });
  });

  describe("createTeam", () => {
    it("should create a team", async () => {
      const input = { name: "New Team", description: "Description" };
      const mockTeam = { id: "team-1", ...input };
      vi.mocked(teamsDb.createTeam).mockResolvedValue(mockTeam as any);

      const result = await service.createTeam(input);

      expect(teamsDb.createTeam).toHaveBeenCalledWith(mockClient, input);
      expect(result).toEqual(mockTeam);
    });
  });

  describe("updateTeam", () => {
    it("should update a team", async () => {
      const input = { id: "team-1", name: "Updated Team" };
      const mockTeam = { id: "team-1", name: "Updated Team" };
      vi.mocked(teamsDb.updateTeam).mockResolvedValue(mockTeam as any);

      const result = await service.updateTeam(input);

      expect(teamsDb.updateTeam).toHaveBeenCalledWith(mockClient, input);
      expect(result).toEqual(mockTeam);
    });
  });

  describe("deleteTeam", () => {
    it("should delete a team", async () => {
      vi.mocked(teamsDb.deleteTeam).mockResolvedValue(undefined);

      await service.deleteTeam("team-1");

      expect(teamsDb.deleteTeam).toHaveBeenCalledWith(mockClient, "team-1");
    });
  });

  describe("getTeamMembers", () => {
    it("should get team members", async () => {
      const mockUsers = [
        { id: "user-1", email: "user1@example.com" },
        { id: "user-2", email: "user2@example.com" },
      ];
      vi.mocked(usersDb.getUsersByTeam).mockResolvedValue(mockUsers as any);

      const result = await service.getTeamMembers("team-1");

      expect(usersDb.getUsersByTeam).toHaveBeenCalledWith(mockClient, "team-1");
      expect(result).toEqual(mockUsers);
    });
  });

  describe("addMemberToTeam", () => {
    it("should add member to team", async () => {
      const mockUser = { id: "user-1", team_id: "team-1" };
      vi.mocked(usersDb.updateUser).mockResolvedValue(mockUser as any);

      const result = await service.addMemberToTeam("user-1", "team-1");

      expect(usersDb.updateUser).toHaveBeenCalledWith(mockClient, {
        id: "user-1",
        team_id: "team-1",
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe("removeMemberFromTeam", () => {
    it("should remove member from team", async () => {
      const mockUser = { id: "user-1", team_id: null };
      vi.mocked(usersDb.updateUser).mockResolvedValue(mockUser as any);

      const result = await service.removeMemberFromTeam("user-1");

      expect(usersDb.updateUser).toHaveBeenCalledWith(mockClient, {
        id: "user-1",
        team_id: null,
      });
      expect(result).toEqual(mockUser);
    });
  });
});
