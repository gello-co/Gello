/**
 * Mock Auth Adapter - In-memory authentication for UI development
 *
 * This adapter allows UI/UX developers to work on all views without
 * any real backend or database connection. It uses fixture data and
 * simulates all auth operations instantly.
 */

import {
  DEFAULT_MOCK_USER,
  getMockUserByEmail,
  MOCK_PASSWORD,
  MOCK_USERS,
} from "../../fixtures/index.js";
import type { IAuthService } from "../../ports/auth.port.js";
import type {
  AuthResult,
  CreateUserInput,
  LoginInput,
  SessionUser,
  User,
} from "../../types/index.js";

export class MockAuthService implements IAuthService {
  private currentUser: User | null = null;
  private mockSession: { access_token: string; refresh_token: string } | null =
    null;

  /**
   * Create a mock auth service
   * @param autoLogin - If true, automatically logs in as default user
   */
  constructor(autoLogin = true) {
    if (autoLogin) {
      this.currentUser = DEFAULT_MOCK_USER;
      this.mockSession = {
        access_token: `mock-token-${DEFAULT_MOCK_USER.id}`,
        refresh_token: `mock-refresh-${DEFAULT_MOCK_USER.id}`,
      };
    }
  }

  /**
   * Set the current mock user (for testing different roles)
   */
  setCurrentUser(user: User | null): void {
    this.currentUser = user;
    if (user) {
      this.mockSession = {
        access_token: `mock-token-${user.id}`,
        refresh_token: `mock-refresh-${user.id}`,
      };
    } else {
      this.mockSession = null;
    }
  }

  /**
   * Login as a specific role (convenience method for UI development)
   */
  loginAsRole(role: User["role"]): User {
    const user = MOCK_USERS.find((u) => u.role === role);
    if (!user) {
      throw new Error(`No mock user with role: ${role}`);
    }
    this.setCurrentUser(user);
    return user;
  }

  async register(input: CreateUserInput): Promise<AuthResult> {
    // Check if user already exists
    const existing = getMockUserByEmail(input.email);
    if (existing) {
      throw new Error("User with this email already exists");
    }

    // Create new mock user
    const newUser: User = {
      id: `user-mock-${Date.now()}`,
      email: input.email,
      display_name: input.display_name,
      role: input.role ?? "member",
      team_id: input.team_id ?? null,
      total_points: 0,
      avatar_url: input.avatar_url ?? null,
      created_at: new Date().toISOString(),
    };

    // Auto-login after registration
    this.currentUser = newUser;
    this.mockSession = {
      access_token: `mock-token-${newUser.id}`,
      refresh_token: `mock-refresh-${newUser.id}`,
    };

    return {
      user: newUser,
      session: this.mockSession,
    };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = getMockUserByEmail(input.email);

    if (!user || input.password !== MOCK_PASSWORD) {
      throw new Error("Invalid email or password");
    }

    this.currentUser = user;
    this.mockSession = {
      access_token: `mock-token-${user.id}`,
      refresh_token: `mock-refresh-${user.id}`,
    };

    return {
      user,
      session: this.mockSession,
    };
  }

  async getSession(): Promise<SessionUser | null> {
    if (!this.currentUser) {
      return null;
    }

    const { created_at: _, ...sessionUser } = this.currentUser;
    return sessionUser;
  }

  async logout(): Promise<void> {
    this.currentUser = null;
    this.mockSession = null;
  }

  async isAuthenticated(): Promise<boolean> {
    return this.currentUser !== null;
  }

  async getAccessToken(): Promise<string | null> {
    return this.mockSession?.access_token ?? null;
  }

  /**
   * Get the current user (for direct access in tests)
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Reset to initial state (logged in as default user)
   * Used for test isolation
   */
  reset(): void {
    this.currentUser = DEFAULT_MOCK_USER;
    this.mockSession = {
      access_token: `mock-token-${DEFAULT_MOCK_USER.id}`,
      refresh_token: `mock-refresh-${DEFAULT_MOCK_USER.id}`,
    };
  }
}

/**
 * Create a pre-configured mock auth service for UI development
 * Auto-logs in as admin by default
 */
export function createMockAuthService(options?: {
  autoLogin?: boolean;
  role?: User["role"];
}): MockAuthService {
  const service = new MockAuthService(options?.autoLogin ?? true);
  if (options?.role) {
    service.loginAsRole(options.role);
  }
  return service;
}
