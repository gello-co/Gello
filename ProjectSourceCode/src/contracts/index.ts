/**
 * Contracts Module - Public API
 *
 * This is the main entry point for the contracts system.
 * Import from here to get types, services, and fixtures.
 *
 * Usage Examples:
 *
 * 1. Get services (auto-detects mock/real based on env):
 *    import { getServices } from '@/contracts';
 *    const { auth, teams, boards } = getServices();
 *
 * 2. Use types:
 *    import type { User, Team, Board } from '@/contracts';
 *
 * 3. Create test container:
 *    import { createTestContainer } from '@/contracts';
 *    const services = createTestContainer();
 *
 * 4. Access fixtures directly:
 *    import { MOCK_USERS, MOCK_TEAMS } from '@/contracts/fixtures';
 */

// Mock adapters (for direct use in tests/storybook)
export {
  createMockAuthService,
  createMockBoardService,
  createMockTaskService,
  createMockTeamService,
  createMockUserService,
  MockAuthService,
  MockBoardService,
  MockTaskService,
  MockTeamService,
  MockUserService,
} from "./adapters/mock/index.js";
// Container (DI)
export {
  type ContainerConfig,
  createCustomContainer,
  createTestContainer,
  getContainerConfig,
  getServices,
  isMockMode,
  resetContainer,
  resetMockServices,
  type ServiceContainer,
} from "./container.js";
// Port interfaces
export type {
  IAuthService,
  IBoardService,
  ITaskService,
  ITeamService,
  IUserService,
} from "./ports/index.js";
// Types
export type {
  AuthResult,
  AuthSession,
  Board,
  CreateBoardInput,
  CreateListInput,
  CreateTaskInput,
  CreateTeamInput,
  CreateUserInput,
  LeaderboardEntry,
  List,
  LoginInput,
  PointsHistory,
  SessionUser,
  Task,
  Team,
  UpdateBoardInput,
  UpdateListInput,
  UpdateTaskInput,
  UpdateTeamInput,
  UpdateUserInput,
  User,
  UserRole,
} from "./types/index.js";
