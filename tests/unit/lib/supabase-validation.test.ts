/**
 * Unit tests for Supabase environment validation
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateSupabaseEnv } from "../../../ProjectSourceCode/src/lib/database/supabase.js";

describe("Supabase Environment Validation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
    vi.resetAllMocks();
  });

  it("should pass validation with all required env vars", () => {
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_ANON_KEY = "test-anon-key";

    expect(() => validateSupabaseEnv()).not.toThrow();
  });

  it("should throw error if SUPABASE_URL is missing", () => {
    delete process.env.SUPABASE_URL;
    process.env.SUPABASE_ANON_KEY = "test-anon-key";

    expect(() => validateSupabaseEnv()).toThrow("SUPABASE_URL");
  });

  it("should throw error if SUPABASE_ANON_KEY is missing", () => {
    process.env.SUPABASE_URL = "https://test.supabase.co";
    delete process.env.SUPABASE_ANON_KEY;

    expect(() => validateSupabaseEnv()).toThrow("SUPABASE_ANON_KEY");
  });

  it("should throw error if SUPABASE_URL has invalid format", () => {
    process.env.SUPABASE_URL = "not-a-url";
    process.env.SUPABASE_ANON_KEY = "test-anon-key";

    expect(() => validateSupabaseEnv()).toThrow("must start with http");
  });

  it("should accept both http and https URLs", () => {
    process.env.SUPABASE_URL = "http://localhost:54321";
    process.env.SUPABASE_ANON_KEY = "test-anon-key";

    expect(() => validateSupabaseEnv()).not.toThrow();

    process.env.SUPABASE_URL = "https://test.supabase.co";
    expect(() => validateSupabaseEnv()).not.toThrow();
  });
});
