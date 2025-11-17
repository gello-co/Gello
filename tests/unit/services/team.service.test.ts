import { beforeEach, describe, expect, it, vi } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as teamsDb from "../../../ProjectSourceCode/src/lib/database/teams.db.js";
import * as usersDb from "../../../ProjectSourceCode/src/lib/database/users.db.js";
import { TeamService } from "../../../ProjectSourceCode/src/lib/services/team.service.js";
import { mockFn } from "../../setup/helpers/mock.js";

vi.mock("../../../ProjectSourceCode/src/lib/database/teams.db.js", () => ({
  getTeamById: vi.fn(),
  getTeamsByUser: vi.fn(),
  getAllTeams: vi.fn(),
  createTeam: vi.fn(),
  updateTeam: vi.fn(),
  deleteTeam: vi.fn(),
}));
vi.mock("../../../ProjectSourceCode/src/lib/database/users.db.js", () => ({
  getUserById: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  getUsersByTeam: vi.fn(),
  updateUserTeam: vi.fn(),
  removeUserFromTeam: vi.fn(),
}));

describe("TeamService (bun)", () => {
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
      mockFn(teamsDb.getTeamById).mockResolvedValue(mockTeam as any);

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
      mockFn(teamsDb.getAllTeams).mockResolvedValue(mockTeams as any);

      const result = await service.getAllTeams();

      expect(teamsDb.getAllTeams).toHaveBeenCalledWith(mockClient);
      expect(result).toEqual(mockTeams);
    });
  });

  describe("createTeam", () => {
    it("should create a team", async () => {
      const input = { name: "New Team", description: "Description" };
      const mockTeam = { id: "team-1", ...input };
      mockFn(teamsDb.createTeam).mockResolvedValue(mockTeam as any);

      const result = await service.createTeam(input);

      expect(teamsDb.createTeam).toHaveBeenCalledWith(mockClient, input);
      expect(result).toEqual(mockTeam);
    });
  });

  describe("updateTeam", () => {
    it("should update a team", async () => {
      const input = { id: "team-1", name: "Updated Team" };
      const mockTeam = { id: "team-1", name: "Updated Team" };
      mockFn(teamsDb.updateTeam).mockResolvedValue(mockTeam as any);

      const result = await service.updateTeam(input);

      expect(teamsDb.updateTeam).toHaveBeenCalledWith(mockClient, input);
      expect(result).toEqual(mockTeam);
    });
  });

  describe("deleteTeam", () => {
    it("should delete a team", async () => {
      mockFn(teamsDb.deleteTeam).mockResolvedValue(undefined);

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
      mockFn(usersDb.getUsersByTeam).mockResolvedValue(mockUsers as any);

      const result = await service.getTeamMembers("team-1");

      expect(usersDb.getUsersByTeam).toHaveBeenCalledWith(mockClient, "team-1");
      expect(result).toEqual(mockUsers);
    });
  });

  describe("addMemberToTeam", () => {
    it("should add member to team", async () => {
      const mockTeam = { id: "team-1", name: "Team 1" };
      const mockUser = { id: "user-1", team_id: "team-1" };
      mockFn(teamsDb.getTeamById).mockResolvedValue(mockTeam as any);
      mockFn(usersDb.getUserById).mockResolvedValue({ id: "user-1" } as any);
      mockFn(usersDb.updateUser).mockResolvedValue(mockUser as any);

      const result = await service.addMemberToTeam("user-1", "team-1");

      expect(teamsDb.getTeamById).toHaveBeenCalledWith(mockClient, "team-1");
      expect(usersDb.getUserById).toHaveBeenCalledWith(mockClient, "user-1");
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
      mockFn(usersDb.getUserById).mockResolvedValue({ id: "user-1" } as any);
      mockFn(usersDb.updateUser).mockResolvedValue(mockUser as any);

      const result = await service.removeMemberFromTeam("user-1");

      expect(usersDb.getUserById).toHaveBeenCalledWith(mockClient, "user-1");
      expect(usersDb.updateUser).toHaveBeenCalledWith(mockClient, {
        id: "user-1",
        team_id: null,
      });
      expect(result).toEqual(mockUser);
    });
  });
});
