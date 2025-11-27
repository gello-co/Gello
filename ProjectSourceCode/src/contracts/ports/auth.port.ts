/**
 * Auth Port - Interface contract for authentication services
 *
 * Any adapter (Mock, Supabase, Auth0, etc.) must implement this interface.
 * Frontend/routes depend only on this contract, never on concrete implementations.
 */

import type {
  AuthResult,
  CreateUserInput,
  LoginInput,
  SessionUser,
} from "../types/index.js";

export interface IAuthService {
  /**
   * Register a new user
   * @throws DuplicateUserError if email already exists
   */
  register(input: CreateUserInput): Promise<AuthResult>;

  /**
   * Login with email/password
   * @throws InvalidCredentialsError if credentials are wrong
   */
  login(input: LoginInput): Promise<AuthResult>;

  /**
   * Get current session user (if authenticated)
   */
  getSession(): Promise<SessionUser | null>;

  /**
   * Logout current user
   */
  logout(): Promise<void>;

  /**
   * Check if currently authenticated
   */
  isAuthenticated(): Promise<boolean>;

  /**
   * Get access token for API calls (if session exists)
   */
  getAccessToken(): Promise<string | null>;
}
