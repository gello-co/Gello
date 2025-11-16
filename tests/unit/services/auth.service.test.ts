import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as usersDb from "../../../ProjectSourceCode/src/lib/database/users.db.js";
import { AuthService } from "../../../ProjectSourceCode/src/lib/services/auth.service.js";

vi.mock("../../../ProjectSourceCode/src/lib/database/users.db.js");
vi.mock("@supabase/supabase-js", async () => {
  const actual = await vi.importActual("@supabase/supabase-js");
  return {
    ...actual,
    createClient: vi.fn(),
  };
});

describe("AuthService", () => {
  let service: AuthService;
  let mockClient: SupabaseClient;
  let mockAuth: {
    signUp: ReturnType<typeof vi.fn>;
    signInWithPassword: ReturnType<typeof vi.fn>;
    getSession: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
    admin: {
      deleteUser: ReturnType<typeof vi.fn>;
    };
  };
  let serviceRoleClientSpy: ReturnType<typeof vi.spyOn>;

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

    service = new AuthService(mockClient);
    serviceRoleClientSpy = vi.spyOn(service as any, "getServiceRoleClient");
  });

  describe("register", () => {
    it("should register a new user successfully", async () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      const mockAuthUser = {
        id: "auth-user-id",
        email: uniqueEmail,
      };
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

      vi.mocked(mockClient.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockReturnThis(),
      } as any);

      mockAuth.signUp.mockResolvedValue({
        data: {
          user: mockAuthUser,
          session: mockSession,
        },
        error: null,
      });

      const mockServiceRoleClient = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockUser,
                error: null,
              }),
            }),
          }),
        }),
        auth: {
          admin: {
            deleteUser: vi.fn(),
          },
        },
      };
      serviceRoleClientSpy.mockReturnValue(
        mockServiceRoleClient as unknown as SupabaseClient,
      );

      vi.mocked(usersDb.getUserById).mockResolvedValue(mockUser as any);

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
      vi.mocked(mockClient.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "existing-id", email: uniqueEmail },
          error: null,
        }),
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
      vi.mocked(mockClient.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
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

      vi.mocked(usersDb.getUserById).mockResolvedValue(mockUser as any);

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

      vi.mocked(usersDb.getUserById).mockResolvedValue(null);

      // Mock service role client for profile creation attempt
      const mockServiceRoleClient = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "Failed to create profile" },
              }),
            }),
          }),
        }),
        auth: {
          admin: {
            deleteUser: vi.fn(),
          },
        },
      };
      serviceRoleClientSpy.mockReturnValue(
        mockServiceRoleClient as unknown as SupabaseClient,
      );

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

      vi.mocked(usersDb.getUserById).mockResolvedValue(mockUser as any);

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

      vi.mocked(usersDb.getUserById).mockResolvedValue(null);

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
