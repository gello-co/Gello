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
      const mockTeam: teamsDb.Team = {
        id: "team-1",
        name: "Test Team",
        created_at: new Date().toISOString(),
      };
      mockFn(teamsDb.getTeamById).mockResolvedValue(mockTeam);

      const result = await service.getTeam("team-1");

      expect(teamsDb.getTeamById).toHaveBeenCalledWith(mockClient, "team-1");
      expect(result).toEqual(mockTeam);
    });
  });

  describe("getAllTeams", () => {
    it("should get all teams", async () => {
      const mockTeams: teamsDb.Team[] = [
        {
          id: "team-1",
          name: "Team 1",
          created_at: new Date().toISOString(),
        },
        {
          id: "team-2",
          name: "Team 2",
          created_at: new Date().toISOString(),
        },
      ];
      mockFn(teamsDb.getAllTeams).mockResolvedValue(mockTeams);

      const result = await service.getAllTeams();

      expect(teamsDb.getAllTeams).toHaveBeenCalledWith(mockClient);
      expect(result).toEqual(mockTeams);
    });
  });

  describe("createTeam", () => {
    it("should create a team", async () => {
      const input = { name: "New Team", description: "Description" };
      const mockTeam: teamsDb.Team = {
        id: "team-1",
        name: input.name,
        created_at: new Date().toISOString(),
      };
      mockFn(teamsDb.createTeam).mockResolvedValue(mockTeam);

      const result = await service.createTeam(input);

      expect(teamsDb.createTeam).toHaveBeenCalledWith(mockClient, input);
      expect(result).toEqual(mockTeam);
    });
  });

  describe("updateTeam", () => {
    it("should update a team", async () => {
      const input = { id: "team-1", name: "Updated Team" };
      const mockTeam: teamsDb.Team = {
        id: "team-1",
        name: "Updated Team",
        created_at: new Date().toISOString(),
      };
      mockFn(teamsDb.updateTeam).mockResolvedValue(mockTeam);

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
      const mockUsers: usersDb.User[] = [
        {
          id: "user-1",
          email: "user1@example.com",
          password_hash: "hash1",
          display_name: "User 1",
          role: "member",
          team_id: "team-1",
          total_points: 0,
          avatar_url: null,
          created_at: new Date().toISOString(),
        },
        {
          id: "user-2",
          email: "user2@example.com",
          password_hash: "hash2",
          display_name: "User 2",
          role: "member",
          team_id: "team-1",
          total_points: 0,
          avatar_url: null,
          created_at: new Date().toISOString(),
        },
      ];
      mockFn(usersDb.getUsersByTeam).mockResolvedValue(mockUsers);

      const result = await service.getTeamMembers("team-1");

      expect(usersDb.getUsersByTeam).toHaveBeenCalledWith(mockClient, "team-1");
      expect(result).toEqual(mockUsers);
    });
  });

  describe("addMemberToTeam", () => {
    it("should add member to team", async () => {
      const mockTeam: teamsDb.Team = {
        id: "team-1",
        name: "Team 1",
        created_at: new Date().toISOString(),
      };
      const mockUser: usersDb.User = {
        id: "user-1",
        email: "user1@example.com",
        password_hash: "hash1",
        display_name: "User 1",
        role: "member",
        team_id: "team-1",
        total_points: 0,
        avatar_url: null,
        created_at: new Date().toISOString(),
      };
      mockFn(teamsDb.getTeamById).mockResolvedValue(mockTeam);
      mockFn(usersDb.getUserById).mockResolvedValue({
        ...mockUser,
        team_id: null,
      });
      mockFn(usersDb.updateUser).mockResolvedValue(mockUser);

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
      const mockUser: usersDb.User = {
        id: "user-1",
        email: "user1@example.com",
        password_hash: "hash1",
        display_name: "User 1",
        role: "member",
        team_id: null,
        total_points: 0,
        avatar_url: null,
        created_at: new Date().toISOString(),
      };
      mockFn(usersDb.getUserById).mockResolvedValue({
        ...mockUser,
        team_id: "team-1",
      });
      mockFn(usersDb.updateUser).mockResolvedValue(mockUser);

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
