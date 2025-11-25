/**
 * Mock User Adapter - In-memory user data for UI development
 */

import {
  getMockUserByEmail,
  getMockUserById,
  getMockUsersByTeam,
  MOCK_USERS,
} from "../../fixtures/index.js";
import type { IUserService } from "../../ports/user.port.js";
import type { UpdateUserInput, User } from "../../types/index.js";

export class MockUserService implements IUserService {
  // In-memory store (starts with fixture data)
  private users: Map<string, User> = new Map(
    MOCK_USERS.map((u) => [u.id, { ...u }]),
  );

  async getById(id: string): Promise<User | null> {
    return this.users.get(id) ?? getMockUserById(id) ?? null;
  }

  async getByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return getMockUserByEmail(email) ?? null;
  }

  async getByTeam(teamId: string): Promise<User[]> {
    const results: User[] = [];
    for (const user of this.users.values()) {
      if (user.team_id === teamId) results.push(user);
    }
    if (results.length === 0) {
      return getMockUsersByTeam(teamId);
    }
    return results;
  }

  async getAll(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async update(input: UpdateUserInput): Promise<User> {
    const existing = this.users.get(input.id);
    if (!existing) {
      throw new Error(`User not found: ${input.id}`);
    }

    const updated: User = {
      ...existing,
      ...input,
    };
    this.users.set(input.id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    if (!this.users.has(id)) {
      throw new Error(`User not found: ${id}`);
    }
    this.users.delete(id);
  }

  /**
   * Reset to fixture data (for tests)
   */
  reset(): void {
    this.users = new Map(MOCK_USERS.map((u) => [u.id, { ...u }]));
  }

  /**
   * Add a user (for tests)
   */
  addUser(user: User): void {
    this.users.set(user.id, user);
  }
}

export function createMockUserService(): MockUserService {
  return new MockUserService();
}
