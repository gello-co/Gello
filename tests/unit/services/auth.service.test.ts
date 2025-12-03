import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as usersDb from "../../../ProjectSourceCode/src/lib/database/users.db.js";
import { AuthService } from "../../../ProjectSourceCode/src/lib/services/auth.service.js";
import { mockFn } from "../../setup/helpers/mock.js";

vi.mock("../../../ProjectSourceCode/src/lib/database/users.db.js", () => ({
  getUserById: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

describe("AuthService", () => {
  let service: AuthService;
  let mockClient: SupabaseClient;
  let mockServiceRoleClient: SupabaseClient;
  let mockAuth: {
    signUp: ReturnType<typeof vi.fn>;
    signInWithPassword: ReturnType<typeof vi.fn>;
    getSession: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
    admin: {
      deleteUser: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    mockAuth = {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      getSession: vi.fn(),
      signOut: vi.fn(),
      admin: {
        deleteUser: vi.fn(),
      },
    };

    mockClient = {
      auth: mockAuth,
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      }),
    } as unknown as SupabaseClient;

    // Create mock service role client with proper method chain support
    mockServiceRoleClient = {
      from: vi.fn((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn((_columns: string) => ({
              eq: vi.fn((_column: string, _value: string) => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              })),
            })),
            insert: vi.fn((_data: any) => ({
              select: vi.fn((_columns: string) => ({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              })),
            })),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(),
          maybeSingle: vi.fn(),
        };
      }),
      auth: {
        admin: {
          deleteUser: vi.fn(),
        },
      },
    } as unknown as SupabaseClient;

    service = new AuthService(mockClient, mockServiceRoleClient);
  });

  describe("register", () => {
    it("should register a new user successfully", async () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      const mockAuthUser = {
        id: "auth-user-id",
        email: uniqueEmail,
        identities: [{ id: "identity-1" }],
      } as any;
      const mockSession = {
        access_token: "access-token",
        refresh_token: "refresh-token",
      };
      const mockUser = {
        id: "auth-user-id",
        email: uniqueEmail,
        display_name: "Test User",
        role: "member" as const,
        password_hash: "",
      };

      // Configure service role client mock for this test
      mockFn(mockServiceRoleClient.from).mockReturnValue({
        select: vi.fn((_columns: string) => ({
          eq: vi.fn((_column: string, _value: string) => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null, // User doesn't exist yet
              error: null,
            }),
          })),
        })),
        insert: vi.fn((_data: any) => ({
          select: vi.fn((_columns: string) => ({
            single: vi.fn().mockResolvedValue({
              data: mockUser,
              error: null,
            }),
          })),
        })),
      } as any);

      mockAuth.signUp.mockResolvedValue({
        data: {
          user: mockAuthUser,
          session: mockSession,
        },
        error: null,
      });

      mockFn(usersDb.getUserById).mockResolvedValue(mockUser as any);

      const result = await service.register({
        email: uniqueEmail,
        password: "password123",
        display_name: "Test User",
        role: "member",
      });

      expect(mockAuth.signUp).toHaveBeenCalledWith({
        email: uniqueEmail,
        password: "password123",
        options: {
          data: {
            display_name: "Test User",
            role: "member",
          },
        },
      });
      expect(result.user.email).toBe(uniqueEmail);
      expect(result.session).toEqual({
        access_token: "access-token",
        refresh_token: "refresh-token",
      });
    });

    it("should throw error if user already exists", async () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;

      // Configure service role client to return existing user
      mockFn(mockServiceRoleClient.from).mockReturnValue({
        select: vi.fn((_columns: string) => ({
          eq: vi.fn((_column: string, _value: string) => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: "existing-id", email: uniqueEmail },
              error: null,
            }),
          })),
        })),
      } as any);

      await expect(
        service.register({
          email: uniqueEmail,
          password: "password123",
          display_name: "Test User",
        }),
      ).rejects.toThrow("User with this email already exists");
    });

    it("should throw error if auth signup fails", async () => {
      // Configure service role client to return no existing user
      mockFn(mockServiceRoleClient.from).mockReturnValue({
        select: vi.fn((_columns: string) => ({
          eq: vi.fn((_column: string, _value: string) => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          })),
        })),
      } as any);

      mockAuth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Auth error" },
      });

      await expect(
        service.register({
          email: "test@example.com",
          password: "password123",
          display_name: "Test User",
        }),
      ).rejects.toThrow("Registration failed: Auth error");
    });
  });

  describe("login", () => {
    it("should login user successfully", async () => {
      const mockAuthUser = {
        id: "auth-user-id",
        email: "test@example.com",
      };
      const mockSession = {
        access_token: "access-token",
        refresh_token: "refresh-token",
      };
      const mockUser = {
        id: "auth-user-id",
        email: "test@example.com",
        display_name: "Test User",
        role: "member" as const,
        password_hash: "hash",
      };

      mockAuth.signInWithPassword.mockResolvedValue({
        data: {
          user: mockAuthUser,
          session: mockSession,
        },
        error: null,
      });

      mockFn(usersDb.getUserById).mockResolvedValue(mockUser as any);

      const result = await service.login({
        email: "test@example.com",
        password: "password123",
      });

      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
      expect(result.user.email).toBe("test@example.com");
      expect(result.session).toEqual({
        access_token: "access-token",
        refresh_token: "refresh-token",
      });
    });

    it("should throw error for invalid credentials", async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid credentials" },
      });

      await expect(
        service.login({
          email: "test@example.com",
          password: "wrong-password",
        }),
      ).rejects.toThrow("Invalid email or password");
    });

    it("should throw error if user profile not found", async () => {
      const mockAuthUser = { id: "auth-user-id" };

      mockAuth.signInWithPassword.mockResolvedValue({
        data: {
          user: mockAuthUser,
          session: null,
        },
        error: null,
      });

      mockFn(usersDb.getUserById).mockResolvedValue(null);

      // Configure service role client to fail user creation
      mockFn(mockServiceRoleClient.from).mockReturnValue({
        insert: vi.fn((_data: any) => ({
          select: vi.fn((_columns: string) => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Failed to create profile" },
            }),
          })),
        })),
      } as any);

      await expect(
        service.login({
          email: "test@example.com",
          password: "password123",
        }),
      ).rejects.toThrow("User profile not found and failed to create");
    });
  });

  describe("getSession", () => {
    it("should return session user if authenticated", async () => {
      const mockSession = {
        user: {
          id: "auth-user-id",
        },
      };
      const mockUser = {
        id: "auth-user-id",
        email: "test@example.com",
        display_name: "Test User",
        role: "member" as const,
        team_id: null,
        total_points: 100,
        avatar_url: null,
      };

      mockAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      mockFn(usersDb.getUserById).mockResolvedValue(mockUser as any);

      const result = await service.getSession();

      expect(result).toEqual({
        id: "auth-user-id",
        email: "test@example.com",
        display_name: "Test User",
        role: "member",
        team_id: null,
        total_points: 100,
        avatar_url: null,
      });
    });

    it("should return null if no session", async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await service.getSession();

      expect(result).toBeNull();
    });

    it("should return null if user profile not found", async () => {
      const mockSession = {
        user: {
          id: "auth-user-id",
        },
      };

      mockAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      mockFn(usersDb.getUserById).mockResolvedValue(null);

      const result = await service.getSession();

      expect(result).toBeNull();
    });
  });

  describe("logout", () => {
    it("should logout successfully", async () => {
      mockAuth.signOut.mockResolvedValue({ error: null });

      await service.logout();

      expect(mockAuth.signOut).toHaveBeenCalled();
    });

    it("should throw error if logout fails", async () => {
      mockAuth.signOut.mockResolvedValue({
        error: { message: "Logout failed" },
      });

      await expect(service.logout()).rejects.toThrow("Logout failed");
    });
  });
});
