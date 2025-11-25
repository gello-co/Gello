/**
 * Fixtures - Static test data for mock implementations
 *
 * This data is used by MockAuthService, MockTeamService, etc.
 * UI/UX developers can modify these to test different states:
 * - Empty states (no teams, no boards)
 * - Populated states (many items)
 * - Edge cases (long names, special characters)
 */

import type {
  Board,
  LeaderboardEntry,
  List,
  PointsHistory,
  Task,
  Team,
  User,
} from "../types/index.js";

// =============================================================================
// Users
// =============================================================================

export const MOCK_USERS: User[] = [
  {
    id: "user-admin-001",
    email: "admin@gello.dev",
    display_name: "Admin User",
    role: "admin",
    team_id: "team-001",
    total_points: 500,
    avatar_url: "/images/black-pfp.png",
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "user-manager-001",
    email: "manager@gello.dev",
    display_name: "Manager User",
    role: "manager",
    team_id: "team-001",
    total_points: 350,
    avatar_url: "/images/green-pfp.png",
    created_at: "2024-01-02T00:00:00Z",
  },
  {
    id: "user-member-001",
    email: "member@gello.dev",
    display_name: "Team Member",
    role: "member",
    team_id: "team-001",
    total_points: 150,
    avatar_url: null,
    created_at: "2024-01-03T00:00:00Z",
  },
  {
    id: "user-member-002",
    email: "alice@gello.dev",
    display_name: "Alice Developer",
    role: "member",
    team_id: "team-001",
    total_points: 280,
    avatar_url: "/images/alice-pfp.png",
    created_at: "2024-01-04T00:00:00Z",
  },
  {
    id: "user-member-003",
    email: "bob@gello.dev",
    display_name: "Bob Designer",
    role: "member",
    team_id: "team-002",
    total_points: 120,
    avatar_url: null,
    created_at: "2024-01-05T00:00:00Z",
  },
];

// Default user for mock auth (when no specific user is logged in)
// biome-ignore lint/style/noNonNullAssertion: MOCK_USERS is guaranteed to have at least one element
export const DEFAULT_MOCK_USER = MOCK_USERS[0]!;

// Password for all mock users
export const MOCK_PASSWORD = "password";

// =============================================================================
// Teams
// =============================================================================

export const MOCK_TEAMS: Team[] = [
  {
    id: "team-001",
    name: "Engineering",
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "team-002",
    name: "Design",
    created_at: "2024-01-02T00:00:00Z",
  },
  {
    id: "team-003",
    name: "Marketing",
    created_at: "2024-01-03T00:00:00Z",
  },
];

// =============================================================================
// Boards
// =============================================================================

export const MOCK_BOARDS: Board[] = [
  {
    id: "board-001",
    name: "Sprint 1",
    description: "Current sprint tasks",
    team_id: "team-001",
    created_by: "user-admin-001",
    created_at: "2024-01-10T00:00:00Z",
  },
  {
    id: "board-002",
    name: "Backlog",
    description: "Future work items",
    team_id: "team-001",
    created_by: "user-manager-001",
    created_at: "2024-01-11T00:00:00Z",
  },
  {
    id: "board-003",
    name: "Design System",
    description: "UI component library",
    team_id: "team-002",
    created_by: "user-member-003",
    created_at: "2024-01-12T00:00:00Z",
  },
];

// =============================================================================
// Lists
// =============================================================================

export const MOCK_LISTS: List[] = [
  {
    id: "list-001",
    board_id: "board-001",
    name: "To Do",
    position: 0,
    created_at: "2024-01-10T00:00:00Z",
  },
  {
    id: "list-002",
    board_id: "board-001",
    name: "In Progress",
    position: 1,
    created_at: "2024-01-10T00:00:00Z",
  },
  {
    id: "list-003",
    board_id: "board-001",
    name: "Done",
    position: 2,
    created_at: "2024-01-10T00:00:00Z",
  },
  {
    id: "list-004",
    board_id: "board-002",
    name: "Ideas",
    position: 0,
    created_at: "2024-01-11T00:00:00Z",
  },
  {
    id: "list-005",
    board_id: "board-002",
    name: "Prioritized",
    position: 1,
    created_at: "2024-01-11T00:00:00Z",
  },
];

// =============================================================================
// Tasks
// =============================================================================

export const MOCK_TASKS: Task[] = [
  {
    id: "task-001",
    list_id: "list-001",
    title: "Implement user authentication",
    description: "Add login and registration forms",
    assigned_to: "user-member-001",
    story_points: 5,
    position: 0,
    created_at: "2024-01-15T00:00:00Z",
    completed_at: null,
  },
  {
    id: "task-002",
    list_id: "list-001",
    title: "Design dashboard layout",
    description: "Create wireframes for main dashboard",
    assigned_to: "user-member-002",
    story_points: 3,
    position: 1,
    created_at: "2024-01-15T00:00:00Z",
    completed_at: null,
  },
  {
    id: "task-003",
    list_id: "list-002",
    title: "Build API endpoints",
    description: "REST API for boards and tasks",
    assigned_to: "user-member-001",
    story_points: 8,
    position: 0,
    created_at: "2024-01-14T00:00:00Z",
    completed_at: null,
  },
  {
    id: "task-004",
    list_id: "list-003",
    title: "Setup project structure",
    description: "Initialize repository and tooling",
    assigned_to: "user-admin-001",
    story_points: 2,
    position: 0,
    created_at: "2024-01-10T00:00:00Z",
    completed_at: "2024-01-11T00:00:00Z",
  },
  {
    id: "task-005",
    list_id: "list-003",
    title: "Configure CI/CD pipeline",
    description: "GitHub Actions for tests and deploy",
    assigned_to: "user-admin-001",
    story_points: 3,
    position: 1,
    created_at: "2024-01-11T00:00:00Z",
    completed_at: "2024-01-12T00:00:00Z",
  },
];

// =============================================================================
// Points History
// =============================================================================

export const MOCK_POINTS_HISTORY: PointsHistory[] = [
  {
    id: "points-001",
    user_id: "user-admin-001",
    task_id: "task-004",
    points_earned: 20,
    reason: "task_complete",
    created_at: "2024-01-11T00:00:00Z",
  },
  {
    id: "points-002",
    user_id: "user-admin-001",
    task_id: "task-005",
    points_earned: 30,
    reason: "task_complete",
    created_at: "2024-01-12T00:00:00Z",
  },
];

// =============================================================================
// Leaderboard (computed from users)
// =============================================================================

export const MOCK_LEADERBOARD: LeaderboardEntry[] = MOCK_USERS.filter(
  (u) => u.team_id === "team-001",
)
  .sort((a, b) => b.total_points - a.total_points)
  .map((user, index) => ({
    user_id: user.id,
    display_name: user.display_name,
    avatar_url: user.avatar_url,
    total_points: user.total_points,
    rank: index + 1,
  }));

// =============================================================================
// Helper functions for tests
// =============================================================================

/**
 * Get a mock user by email (for login simulation)
 */
export function getMockUserByEmail(email: string): User | undefined {
  return MOCK_USERS.find((u) => u.email === email);
}

/**
 * Get a mock user by ID
 */
export function getMockUserById(id: string): User | undefined {
  return MOCK_USERS.find((u) => u.id === id);
}

/**
 * Get mock users by team
 */
export function getMockUsersByTeam(teamId: string): User[] {
  return MOCK_USERS.filter((u) => u.team_id === teamId);
}

/**
 * Get mock boards by team
 */
export function getMockBoardsByTeam(teamId: string): Board[] {
  return MOCK_BOARDS.filter((b) => b.team_id === teamId);
}

/**
 * Get mock lists by board
 */
export function getMockListsByBoard(boardId: string): List[] {
  return MOCK_LISTS.filter((l) => l.board_id === boardId).sort(
    (a, b) => a.position - b.position,
  );
}

/**
 * Get mock tasks by list
 */
export function getMockTasksByList(listId: string): Task[] {
  return MOCK_TASKS.filter((t) => t.list_id === listId).sort(
    (a, b) => a.position - b.position,
  );
}
