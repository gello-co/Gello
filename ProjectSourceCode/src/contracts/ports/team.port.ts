/**
 * Team Port - Interface contract for team services
 */

import type { CreateTeamInput, Team, UpdateTeamInput } from "../types/index.js";

export interface ITeamService {
  /**
   * Get team by ID
   */
  getById(id: string): Promise<Team | null>;

  /**
   * Get all teams
   */
  getAll(): Promise<Team[]>;

  /**
   * Create a new team
   */
  create(input: CreateTeamInput): Promise<Team>;

  /**
   * Update team
   */
  update(input: UpdateTeamInput): Promise<Team>;

  /**
   * Delete team
   */
  delete(id: string): Promise<void>;
}
