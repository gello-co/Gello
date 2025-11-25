/**
 * User Port - Interface contract for user data services
 */

import type { UpdateUserInput, User } from "../types/index.js";

export interface IUserService {
  /**
   * Get user by ID
   */
  getById(id: string): Promise<User | null>;

  /**
   * Get user by email
   */
  getByEmail(email: string): Promise<User | null>;

  /**
   * Get all users in a team
   */
  getByTeam(teamId: string): Promise<User[]>;

  /**
   * Get all users (admin only)
   */
  getAll(): Promise<User[]>;

  /**
   * Update user profile
   */
  update(input: UpdateUserInput): Promise<User>;

  /**
   * Delete user
   */
  delete(id: string): Promise<void>;
}
