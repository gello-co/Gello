import type { SupabaseClient } from "@supabase/supabase-js";
import { ResourceNotFoundError } from "../errors/app.errors.js";
import { logger } from "../logger.js";
import type { CreateTeamInput, UpdateTeamInput } from "../schemas/team.js";

export type Team = {
  id: string;
  name: string;
  created_at: string;
};

export type User = {
  id: string;
  email: string;
  display_name: string;
  team_id: string | null;
  role: string;
  total_points: number;
  created_at: string;
};

export class TeamService {
  constructor(private supabase: SupabaseClient) {}

  async getTeam(id: string): Promise<Team | null> {
    try {
      const { data, error } = await this.supabase
        .from("teams")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }

      return data;
    } catch (error) {
      logger.error({ error, id }, "Failed to get team by ID");
      throw error;
    }
  }

  async getAllTeams(): Promise<Team[]> {
    try {
      const { data, error } = await this.supabase
        .from("teams")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error({ error }, "Failed to get all teams");
      throw error;
    }
  }

  async createTeam(input: CreateTeamInput): Promise<Team> {
    try {
      const { data, error } = await this.supabase
        .from("teams")
        .insert({
          name: input.name,
        })
        .select()
        .single();

      if (error || !data) {
        throw error || new Error("Failed to create team: No data returned");
      }

      return data;
    } catch (error) {
      logger.error({ error, input }, "Failed to create team");
      throw error;
    }
  }

  async createTeamWithManager(
    input: CreateTeamInput,
    managerId: string,
  ): Promise<{ team: Team; user: User }> {
    try {
      // Create team first
      const { data: team, error: teamError } = await this.supabase
        .from("teams")
        .insert({
          name: input.name,
        })
        .select()
        .single();

      if (teamError || !team) {
        throw teamError || new Error("Failed to create team: No data returned");
      }

      // Then assign manager to team
      const { data: user, error: userError } = await this.supabase
        .from("users")
        .update({ team_id: team.id })
        .eq("id", managerId)
        .select()
        .single();

      if (userError || !user) {
        // If user update fails, rollback by deleting the team
        const { error: rollbackError } = await this.supabase
          .from("teams")
          .delete()
          .eq("id", team.id);

        if (rollbackError) {
          logger.error(
            { rollbackError, teamId: team.id, userError },
            "Failed to rollback team creation after user update failure",
          );
        }

        throw (
          userError || new ResourceNotFoundError(`User not found: ${managerId}`)
        );
      }

      return { team, user };
    } catch (error) {
      logger.error(
        { error, input, managerId },
        "Failed to create team with manager",
      );
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw error;
    }
  }

  async updateTeam(input: UpdateTeamInput & { id: string }): Promise<Team> {
    try {
      const { id, ...updates } = input;

      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (updates.name !== undefined) updateData.name = updates.name;

      const { data, error } = await this.supabase
        .from("teams")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          throw new ResourceNotFoundError(`Team not found: ${id}`);
        }
        throw error;
      }

      if (!data) {
        throw new ResourceNotFoundError(`Team not found: ${id}`);
      }

      return data;
    } catch (error) {
      logger.error({ error, input }, "Failed to update team");
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw error;
    }
  }

  async deleteTeam(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("teams")
        .delete()
        .eq("id", id)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          throw new ResourceNotFoundError(`Team not found: ${id}`);
        }
        throw error;
      }
    } catch (error) {
      logger.error({ error, id }, "Failed to delete team");
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw error;
    }
  }

  async getTeamMembers(teamId: string): Promise<User[]> {
    try {
      // Verify team exists first
      const team = await this.getTeam(teamId);
      if (!team) {
        throw new ResourceNotFoundError("Team not found");
      }

      const { data, error } = await this.supabase
        .from("users")
        .select("*")
        .eq("team_id", teamId);

      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error({ error, teamId }, "Failed to get team members");
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw error;
    }
  }

  async addMemberToTeam(userId: string, teamId: string): Promise<User> {
    try {
      // Verify team exists first
      const team = await this.getTeam(teamId);
      if (!team) {
        throw new ResourceNotFoundError("Team not found");
      }

      const { data, error } = await this.supabase
        .from("users")
        .update({ team_id: teamId })
        .eq("id", userId)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          throw new ResourceNotFoundError("User not found");
        }
        throw error;
      }

      if (!data) {
        throw new ResourceNotFoundError("User not found");
      }

      return data;
    } catch (error) {
      logger.error({ error, userId, teamId }, "Failed to add member to team");
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw error;
    }
  }

  async removeMemberFromTeam(userId: string): Promise<User> {
    try {
      const { data, error } = await this.supabase
        .from("users")
        .update({ team_id: null })
        .eq("id", userId)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          throw new ResourceNotFoundError("User not found");
        }
        throw error;
      }

      if (!data) {
        throw new ResourceNotFoundError("User not found");
      }

      return data;
    } catch (error) {
      logger.error({ error, userId }, "Failed to remove member from team");
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw error;
    }
  }
}
