/**
 * Service Container - Dependency Injection for service switching
 *
 * This container provides a single point to switch between:
 * - Mock implementations (MOCK_MODE=true) - for UI dev, fast tests
 * - Real implementations (MOCK_MODE=false) - for production, integration tests
 *
 * Usage:
 *   import { getServices } from '@/contracts/container.js';
 *   const { auth, teams, boards } = getServices();
 *
 * Environment Variables:
 *   MOCK_MODE=true     - Use mock implementations (default in test)
 *   MOCK_AUTH=true     - Only mock auth, real everything else
 *   MOCK_AUTO_LOGIN=false - Don't auto-login in mock mode
 */

import {
  createMockAuthService,
  createMockBoardService,
  createMockTaskService,
  createMockTeamService,
  createMockUserService,
} from "./adapters/mock/index.js";
import type { IAuthService } from "./ports/auth.port.js";
import type { IBoardService } from "./ports/board.port.js";
import type { ITaskService } from "./ports/task.port.js";
import type { ITeamService } from "./ports/team.port.js";
import type { IUserService } from "./ports/user.port.js";

// =============================================================================
// Service Container Type
// =============================================================================

/** Interface for services that support state reset (mock services) */
export interface Resettable {
  reset(): void;
}

/** Type guard to check if a service implements Resettable */
function isResettable(service: unknown): service is Resettable {
  return (
    typeof service === "object" &&
    service !== null &&
    "reset" in service &&
    typeof (service as Resettable).reset === "function"
  );
}

export interface ServiceContainer {
  auth: IAuthService;
  users: IUserService;
  teams: ITeamService;
  boards: IBoardService;
  tasks: ITaskService;
}

// =============================================================================
// Configuration
// =============================================================================

export type ContainerConfig = {
  mockMode: boolean;
  mockAuth: boolean;
  mockAutoLogin: boolean;
};

function getConfig(): ContainerConfig {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const isTest = nodeEnv === "test";

  return {
    // Default to mock in test, real in production
    mockMode:
      process.env.MOCK_MODE === "true" ||
      (isTest && process.env.MOCK_MODE !== "false"),

    // Allow mocking just auth while using real data services
    mockAuth: process.env.MOCK_AUTH === "true",

    // Auto-login in mock mode (disable with MOCK_AUTO_LOGIN=false)
    mockAutoLogin: process.env.MOCK_AUTO_LOGIN !== "false",
  };
}

// =============================================================================
// Container Singleton
// =============================================================================

let containerInstance: ServiceContainer | null = null;
let containerConfig: ContainerConfig | null = null;

/**
 * Create a new service container with given config
 */
function createContainer(config: ContainerConfig): ServiceContainer {
  if (config.mockMode) {
    // Full mock mode - all services are mocks
    return {
      auth: createMockAuthService({ autoLogin: config.mockAutoLogin }),
      users: createMockUserService(),
      teams: createMockTeamService(),
      boards: createMockBoardService(),
      tasks: createMockTaskService(),
    };
  }

  if (config.mockAuth) {
    // Hybrid mode - mock auth only
    // Real services would be created here, but for now just throw
    throw new Error(
      "Hybrid mode (MOCK_AUTH=true with real data services) not yet implemented. " +
        "Use MOCK_MODE=true for full mocks or implement real Supabase adapters.",
    );
  }

  // Real mode - would use Supabase adapters
  // For now, throw to indicate not implemented
  throw new Error(
    "Real Supabase adapters not yet implemented in container. " +
      "Set MOCK_MODE=true to use mock services, or use the existing service layer directly.",
  );
}

/**
 * Get the service container (creates on first call)
 *
 * Services are created once and reused for the application lifetime.
 */
export function getServices(): ServiceContainer {
  if (!containerInstance) {
    containerConfig = getConfig();
    containerInstance = createContainer(containerConfig);
  }
  return containerInstance;
}

/**
 * Get current container configuration
 */
export function getContainerConfig(): ContainerConfig {
  if (!containerConfig) {
    containerConfig = getConfig();
  }
  return containerConfig;
}

/**
 * Check if running in mock mode
 */
export function isMockMode(): boolean {
  return getContainerConfig().mockMode;
}

/**
 * Reset container (for tests)
 */
export function resetContainer(): void {
  containerInstance = null;
  containerConfig = null;
}

/**
 * Create a custom container with specific services (for tests)
 */
export function createCustomContainer(
  overrides: Partial<ServiceContainer>,
): ServiceContainer {
  const defaultContainer = getServices();
  return {
    ...defaultContainer,
    ...overrides,
  };
}

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Create a fully mocked container for tests
 * Ignores environment variables
 */
export function createTestContainer(options?: {
  autoLogin?: boolean;
}): ServiceContainer {
  return {
    auth: createMockAuthService({ autoLogin: options?.autoLogin ?? true }),
    users: createMockUserService(),
    teams: createMockTeamService(),
    boards: createMockBoardService(),
    tasks: createMockTaskService(),
  };
}

/**
 * Reset all mock services to fixture data (for test isolation)
 */
export function resetMockServices(container: ServiceContainer): void {
  for (const service of Object.values(container)) {
    if (isResettable(service)) {
      service.reset();
    }
  }
}
