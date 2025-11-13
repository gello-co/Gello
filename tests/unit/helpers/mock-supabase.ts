/**
 * Mock Supabase client for unit testing
 * Provides type-safe mocks for Supabase operations
 *
 * Note: This file is kept for reference but most tests use vi.mock() directly
 * to mock database functions rather than mocking SupabaseClient.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { vi } from "vitest";

export type MockSupabaseClient = SupabaseClient;

/**
 * Creates a mock Supabase client for unit tests
 */
export function createMockSupabaseClient(): MockSupabaseClient {
  const mockFrom = vi.fn();
  const mockAuth = {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    getUser: vi.fn(),
    signOut: vi.fn(),
  };
  const mockRpc = vi.fn();

  return {
    from: mockFrom,
    auth: mockAuth,
    rpc: mockRpc,
  } as unknown as MockSupabaseClient;
}

/**
 * Helper to create a mock query builder chain
 */
export function createMockQueryBuilder(data: unknown, error: unknown = null) {
  const mockSelect = vi.fn().mockReturnThis();
  const mockInsert = vi.fn().mockReturnThis();
  const mockUpdate = vi.fn().mockReturnThis();
  const mockDelete = vi.fn().mockReturnThis();
  const mockEq = vi.fn().mockReturnThis();
  const mockSingle = vi.fn().mockResolvedValue({ data, error });
  const mockMaybeSingle = vi.fn().mockResolvedValue({ data, error });
  const mockOrder = vi.fn().mockReturnThis();
  const mockLimit = vi.fn().mockResolvedValue({ data, error });

  return {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
    order: mockOrder,
    limit: mockLimit,
  };
}
