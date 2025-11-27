/**
 * Mock Team Adapter - In-memory team data for UI development
 */

import { MOCK_TEAMS } from "../../fixtures/index.js";
import type { ITeamService } from "../../ports/team.port.js";
import type {
  CreateTeamInput,
  Team,
  UpdateTeamInput,
} from "../../types/index.js";

export class MockTeamService implements ITeamService {
  private teams: Map<string, Team> = new Map(
    MOCK_TEAMS.map((t) => [t.id, { ...t }]),
  );

  async getById(id: string): Promise<Team | null> {
    return this.teams.get(id) ?? null;
  }

  async getAll(): Promise<Team[]> {
    return Array.from(this.teams.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  async create(input: CreateTeamInput): Promise<Team> {
    const team: Team = {
      id: `team-mock-${Date.now()}`,
      name: input.name,
      created_at: new Date().toISOString(),
    };
    this.teams.set(team.id, team);
    return team;
  }

  async update(input: UpdateTeamInput): Promise<Team> {
    const existing = this.teams.get(input.id);
    if (!existing) {
      throw new Error(`Team not found: ${input.id}`);
    }

    const updated: Team = {
      ...existing,
      ...input,
    };
    this.teams.set(input.id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    if (!this.teams.has(id)) {
      throw new Error(`Team not found: ${id}`);
    }
    this.teams.delete(id);
  }

  /**
   * Reset to fixture data (for tests)
   */
  reset(): void {
    this.teams = new Map(MOCK_TEAMS.map((t) => [t.id, { ...t }]));
  }
}

export function createMockTeamService(): MockTeamService {
  return new MockTeamService();
}
