/**
 * Unit tests for Supabase environment validation
 */

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the env module to avoid caching issues and provide direct process.env access
vi.mock('../../../ProjectSourceCode/src/config/env.js', async () => {
  return {
    env: new Proxy(
      {},
      {
        get: (_target, prop: string) => {
          // Map property names to process.env with fallbacks (matching real env.ts logic)
          if (prop === 'SUPABASE_URL') {
            return (
              process.env.SUPABASE_URL ||
              process.env.SB_URL ||
              process.env.API_URL ||
              process.env.SUPABASE_LOCAL_URL
            );
          }
          if (prop === 'SUPABASE_PUBLISHABLE_KEY') {
            return (
              process.env.SUPABASE_PUBLISHABLE_KEY ||
              process.env.SB_PUBLISHABLE_KEY ||
              process.env.PUBLISHABLE_KEY ||
              process.env.SUPABASE_LOCAL_ANON_KEY ||
              process.env.ANON_KEY
            );
          }
          return (process.env as Record<string, string | undefined>)[prop];
        },
      }
    ),
  };
});

import { validateSupabaseEnv } from '../../../ProjectSourceCode/src/lib/database/supabase.js';

describe('Supabase Environment Validation', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset environment before each test - clear ALL supabase-related vars
    delete process.env.SUPABASE_URL;
    delete process.env.SB_URL;
    delete process.env.API_URL;
    delete process.env.SUPABASE_LOCAL_URL;
    delete process.env.SUPABASE_PUBLISHABLE_KEY;
    delete process.env.SB_PUBLISHABLE_KEY;
    delete process.env.PUBLISHABLE_KEY;
    delete process.env.SUPABASE_LOCAL_ANON_KEY;
    delete process.env.ANON_KEY;
    vi.resetAllMocks();
  });

  afterAll(() => {
    // Restore original environment
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
  });

  it('should pass validation with all required env vars', () => {
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';

    expect(() => validateSupabaseEnv()).not.toThrow();
  });

  it('should pass validation with Doppler naming convention (SB_URL, SB_PUBLISHABLE_KEY)', () => {
    process.env.SB_URL = 'https://test.supabase.co';
    process.env.SB_PUBLISHABLE_KEY = 'test-publishable-key';

    expect(() => validateSupabaseEnv()).not.toThrow();
  });

  it('should pass validation with local Supabase naming convention', () => {
    process.env.API_URL = 'http://localhost:54321';
    process.env.ANON_KEY = 'local-anon-key';

    expect(() => validateSupabaseEnv()).not.toThrow();
  });

  it('should throw error if SUPABASE_URL is missing', () => {
    process.env.SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';

    expect(() => validateSupabaseEnv()).toThrow('SUPABASE_URL');
  });

  it('should throw error if SUPABASE_PUBLISHABLE_KEY is missing', () => {
    process.env.SUPABASE_URL = 'https://test.supabase.co';

    expect(() => validateSupabaseEnv()).toThrow('SUPABASE_PUBLISHABLE_KEY');
  });

  it('should throw error if SUPABASE_URL has invalid format', () => {
    process.env.SUPABASE_URL = 'not-a-url';
    process.env.SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';

    expect(() => validateSupabaseEnv()).toThrow('must start with http');
  });

  it('should accept both http and https URLs', () => {
    process.env.SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';

    process.env.SUPABASE_URL = 'http://localhost:54321';
    expect(() => validateSupabaseEnv()).not.toThrow();

    process.env.SUPABASE_URL = 'https://test.supabase.co';
    expect(() => validateSupabaseEnv()).not.toThrow();
  });
});
