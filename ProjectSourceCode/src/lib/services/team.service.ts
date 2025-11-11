import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createTeam,
  deleteTeam,
  getAllTeams,
  getTeamById,
  type Team,
  updateTeam,
} from "../database/teams.db.js";
import { getUsersByTeam, type User, updateUser } from "../database/users.db.js";
import type { CreateTeamInput, UpdateTeamInput } from "../schemas/team.js";

export class TeamService {
  constructor(private client: SupabaseClient) {}

  async getTeam(id: string): Promise<Team | null> {
    return getTeamById(this.client, id);
  }

  async getAllTeams(): Promise<Team[]> {
    return getAllTeams(this.client);
  }

  async createTeam(input: CreateTeamInput): Promise<Team> {
    return createTeam(this.client, input);
  }

  async updateTeam(input: UpdateTeamInput): Promise<Team> {
    return updateTeam(this.client, input);
  }

  async deleteTeam(id: string): Promise<void> {
    return deleteTeam(this.client, id);
  }

  async getTeamMembers(teamId: string): Promise<User[]> {
    return getUsersByTeam(this.client, teamId);
  }

  async addMemberToTeam(userId: string, teamId: string): Promise<User> {
    return updateUser(this.client, {
      id: userId,
      team_id: teamId,
    });
  }

  async removeMemberFromTeam(userId: string): Promise<User> {
    return updateUser(this.client, {
      id: userId,
      team_id: null,
    });
  }
}
