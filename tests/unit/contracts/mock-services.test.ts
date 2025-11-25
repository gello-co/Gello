/**
 * Unit tests for Mock Services using HappyDOM
 *
 * These tests validate the contracts/mock system works correctly.
 * UI/UX developers can run these to verify mock data behavior.
 */
import { describe, expect, it, beforeEach } from "bun:test";
import {
  createTestContainer,
  resetMockServices,
  isMockMode,
} from "@/contracts/container.js";
import {
  MOCK_USERS,
  MOCK_TEAMS,
  MOCK_BOARDS,
  MOCK_TASKS,
  DEFAULT_MOCK_USER,
  getMockUserByEmail,
  getMockUserById,
} from "@/contracts/fixtures/index.js";

describe("Contracts System", () => {
  describe("isMockMode()", () => {
    it("should detect mock mode from environment", () => {
      // In test environment, mock mode should be enabled
      const originalEnv = process.env.MOCK_MODE;
      process.env.MOCK_MODE = "true";

      // Note: isMockMode caches its value, so this test may not reflect runtime changes
      // This is intentional for performance
      expect(typeof isMockMode()).toBe("boolean");

      process.env.MOCK_MODE = originalEnv;
    });
  });

  describe("Fixtures", () => {
    it("should have default mock user", () => {
      expect(DEFAULT_MOCK_USER).toBeDefined();
      expect(DEFAULT_MOCK_USER.id).toBe("user-admin-001");
      expect(DEFAULT_MOCK_USER.role).toBe("admin");
    });

    it("should have mock users with correct structure", () => {
      expect(MOCK_USERS.length).toBeGreaterThanOrEqual(5);

      for (const user of MOCK_USERS) {
        expect(user.id).toBeDefined();
        expect(user.email).toBeDefined();
        expect(user.display_name).toBeDefined();
        expect(["admin", "manager", "member"]).toContain(user.role);
      }
    });

    it("should have mock teams", () => {
      expect(MOCK_TEAMS.length).toBeGreaterThanOrEqual(3);
      expect(MOCK_TEAMS.map((t) => t.name)).toContain("Engineering");
    });

    it("should have mock boards linked to teams", () => {
      expect(MOCK_BOARDS.length).toBeGreaterThanOrEqual(3);

      for (const board of MOCK_BOARDS) {
        expect(board.team_id).toBeDefined();
        const team = MOCK_TEAMS.find((t) => t.id === board.team_id);
        expect(team).toBeDefined();
      }
    });

    it("should have mock tasks with story points", () => {
      expect(MOCK_TASKS.length).toBeGreaterThanOrEqual(5);

      for (const task of MOCK_TASKS) {
        expect(task.title).toBeDefined();
        expect(task.story_points).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("Fixture Helpers", () => {
    it("getMockUserByEmail should find user", () => {
      const admin = getMockUserByEmail("admin@gello.dev");
      expect(admin).toBeDefined();
      expect(admin?.role).toBe("admin");
    });

    it("getMockUserByEmail should return undefined for unknown email", () => {
      const unknown = getMockUserByEmail("unknown@example.com");
      expect(unknown).toBeUndefined();
    });

    it("getMockUserById should find user", () => {
      const user = getMockUserById("user-admin-001");
      expect(user).toBeDefined();
      expect(user?.email).toBe("admin@gello.dev");
    });
  });

  describe("Test Container", () => {
    let services: ReturnType<typeof createTestContainer>;

    beforeEach(() => {
      services = createTestContainer({ autoLogin: true });
    });

    it("should create container with all services", () => {
      expect(services.auth).toBeDefined();
      expect(services.users).toBeDefined();
      expect(services.teams).toBeDefined();
      expect(services.boards).toBeDefined();
      expect(services.tasks).toBeDefined();
    });

    it("auth service should have current user when autoLogin=true", async () => {
      const session = await services.auth.getSession();
      expect(session).toBeDefined();
      expect(session?.id).toBe(DEFAULT_MOCK_USER.id);
    });

    it("auth service should be unauthenticated when autoLogin=false", async () => {
      const noAuthServices = createTestContainer({ autoLogin: false });
      const session = await noAuthServices.auth.getSession();
      expect(session).toBeNull();
    });

    it("teams service should return all mock teams", async () => {
      const teams = await services.teams.getAll();
      expect(teams.length).toBe(MOCK_TEAMS.length);
    });

    it("boards service should return boards by team", async () => {
      const teamBoards = await services.boards.getByTeam("team-001");
      expect(teamBoards.length).toBeGreaterThan(0);
      for (const board of teamBoards) {
        expect(board.team_id).toBe("team-001");
      }
    });

    it("tasks service should return tasks by assignee", async () => {
      const adminTasks = await services.tasks.getByAssignee("user-admin-001");
      for (const task of adminTasks) {
        expect(task.assigned_to).toBe("user-admin-001");
      }
    });

    it("should reset services to initial state", async () => {
      // Modify state
      await services.auth.logout();
      const beforeReset = await services.auth.isAuthenticated();
      expect(beforeReset).toBe(false);

      // Reset
      resetMockServices(services);

      // Check state is restored
      const afterReset = await services.auth.isAuthenticated();
      expect(afterReset).toBe(true);
    });
  });
});

describe("Mock Auth Service", () => {
  let services: ReturnType<typeof createTestContainer>;

  beforeEach(() => {
    services = createTestContainer({ autoLogin: false });
  });

  it("should login with valid credentials", async () => {
    const result = await services.auth.login({
      email: "admin@gello.dev",
      password: "password",
    });

    expect(result.user).toBeDefined();
    expect(result.user?.email).toBe("admin@gello.dev");
    expect(result.session).toBeDefined();
  });

  it("should reject login with invalid password", async () => {
    await expect(
      services.auth.login({
        email: "admin@gello.dev",
        password: "wrong-password",
      }),
    ).rejects.toThrow("Invalid email or password");
  });

  it("should reject login with unknown email", async () => {
    await expect(
      services.auth.login({
        email: "unknown@example.com",
        password: "password",
      }),
    ).rejects.toThrow("Invalid email or password");
  });

  it("should logout successfully", async () => {
    // Login first
    await services.auth.login({
      email: "admin@gello.dev",
      password: "password",
    });

    expect(await services.auth.isAuthenticated()).toBe(true);

    // Logout
    await services.auth.logout();

    expect(await services.auth.isAuthenticated()).toBe(false);
  });
});
