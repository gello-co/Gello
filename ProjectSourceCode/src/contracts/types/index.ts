/**
 * Domain Types - Shared contracts for all adapters
 *
 * These types define the shape of data flowing through the application.
 * Both real (Supabase) and mock adapters must satisfy these contracts.
 */

// =============================================================================
// User Types
// =============================================================================

export type UserRole = "admin" | "manager" | "member";

export type User = {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  team_id: string | null;
  total_points: number;
  avatar_url: string | null;
  created_at: string;
};

export type CreateUserInput = {
  email: string;
  password: string;
  display_name: string;
  role?: UserRole;
  team_id?: string | null;
  avatar_url?: string | null;
  total_points?: number;
};

export type UpdateUserInput = Partial<Omit<User, "id" | "created_at">> & {
  id: string;
};

// =============================================================================
// Auth Types
// =============================================================================

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
};

export type AuthResult = {
  user: User;
  session?: AuthSession;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type SessionUser = Omit<User, "created_at">;

// =============================================================================
// Team Types
// =============================================================================

export type Team = {
  id: string;
  name: string;
  created_at: string;
};

export type CreateTeamInput = {
  name: string;
};

export type UpdateTeamInput = {
  id: string;
  name?: string;
};

// =============================================================================
// Board Types
// =============================================================================

export type Board = {
  id: string;
  name: string;
  description: string | null;
  team_id: string;
  created_by: string | null;
  created_at: string;
};

export type CreateBoardInput = {
  name: string;
  description?: string | null;
  team_id: string;
  created_by?: string | null;
};

export type UpdateBoardInput = {
  id: string;
  name?: string;
  description?: string | null;
  team_id?: string;
};

// =============================================================================
// List Types
// =============================================================================

export type List = {
  id: string;
  board_id: string;
  name: string;
  position: number;
  created_at: string;
};

export type CreateListInput = {
  board_id: string;
  name: string;
  position?: number;
};

export type UpdateListInput = {
  id: string;
  name?: string;
  position?: number;
};

// =============================================================================
// Task Types
// =============================================================================

export type Task = {
  id: string;
  list_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  story_points: number;
  position: number;
  created_at: string;
  completed_at: string | null;
};

export type CreateTaskInput = {
  list_id: string;
  title: string;
  description?: string | null;
  assigned_to?: string | null;
  story_points?: number;
  position?: number;
};

export type UpdateTaskInput = {
  id: string;
  list_id?: string;
  title?: string;
  description?: string | null;
  assigned_to?: string | null;
  story_points?: number;
  position?: number;
  completed_at?: string | null;
};

// =============================================================================
// Points Types
// =============================================================================

export type PointsHistory = {
  id: string;
  user_id: string;
  task_id: string | null;
  points_earned: number;
  reason: string;
  created_at: string;
};

export type LeaderboardEntry = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_points: number;
  rank: number;
};
