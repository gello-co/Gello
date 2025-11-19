import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createTeam,
  deleteTeam,
  getAllTeams,
  getTeamById,
  type Team,
  updateTeam,
} from "../database/teams.db.js";
import {
  getUserById,
  getUsersByTeam,
  type User,
  updateUser,
} from "../database/users.db.js";
import {
  ResourceNotFoundError,
  UserNotFoundError,
} from "../errors/app.errors.js";
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

  async createTeamWithManager(
    input: CreateTeamInput,
    managerId: string,
  ): Promise<{ team: Team; user: User }> {
    // Create team first
    const team = await createTeam(this.client, input);

    // Then assign manager to team
    // Note: Supabase client doesn't support transactions directly,
    // but these operations are sequential and we handle errors properly
    const user = await updateUser(this.client, {
      id: managerId,
      team_id: team.id,
    });

    return { team, user };
  }

  async updateTeam(input: UpdateTeamInput): Promise<Team> {
    return updateTeam(this.client, input);
  }

  async deleteTeam(id: string): Promise<void> {
    return deleteTeam(this.client, id);
  }

  async getTeamMembers(teamId: string): Promise<User[]> {
    const team = await getTeamById(this.client, teamId);
    if (!team) {
      throw new ResourceNotFoundError("Team not found");
    }
    return getUsersByTeam(this.client, teamId);
  }

  async addMemberToTeam(userId: string, teamId: string): Promise<User> {
    const team = await getTeamById(this.client, teamId);
    if (!team) {
      throw new ResourceNotFoundError("Team not found");
    }

    const user = await getUserById(this.client, userId);
    if (!user) {
      throw new UserNotFoundError("User not found");
    }

    return updateUser(this.client, {
      id: userId,
      team_id: teamId,
    });
  }

  async removeMemberFromTeam(userId: string): Promise<User> {
    const user = await getUserById(this.client, userId);
    if (!user) {
      throw new UserNotFoundError("User not found");
    }

    return updateUser(this.client, {
      id: userId,
      team_id: null,
    });
  }
}
