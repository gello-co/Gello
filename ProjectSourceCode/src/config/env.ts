/**
 * Environment configuration
 *
 * Bun automatically loads .env files from the project root.
 *
 * Required environment variables:
 * - NODE_ENV: Environment (development, test, production)
 * - PORT: Server port (defaults to 3000)
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_PUBLISHABLE_KEY: Supabase publishable/anonymous key
 * - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key (JWT format, for admin operations)
 *
 * Optional:
 * - DEV_BYPASS_AUTH: Set to "true" to bypass authentication in development
 *
 * Environment file locations (Bun loads automatically):
 * - .env (project root)
 * - .env.local (project root, gitignored)
 * - ProjectSourceCode/.env.local (for local overrides)
 *
 * IMPORTANT: Environment variables are resolved lazily (on first access) to support
 * test frameworks like Vitest that load env vars after module initialization.
 */

import { logger } from "../lib/logger.js";

export type AppEnv = {
  NODE_ENV: string | undefined;
  PORT: string | undefined;
  DEV_BYPASS_AUTH?: string;
  AUTH_SITE_URL?: string;
  DATABASE_URL?: string;
  DB_POOL_MAX?: number;
  DB_IDLE_TIMEOUT?: number;
  DB_CONNECT_TIMEOUT?: number;
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

function pick(...candidates: Array<string | undefined>) {
  for (const v of candidates) if (v && v.length > 0) return v;
  return undefined;
}

function parseNumber(
  value: string | undefined,
  name?: string,
): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (Number.isFinite(parsed)) return parsed;

  logger.warn(
    {
      envVar: name ?? "UNKNOWN_ENV_VAR",
      value,
    },
    "Invalid numeric environment variable value; falling back to default",
  );
  return undefined;
}

/**
 * Validates that a service role key is in JWT format.
 * JWT keys have the structure: header.payload.signature (three parts separated by dots).
 * New API key format (sb_secret_...) does not work for admin operations.
 */
function validateServiceRoleKey(key: string): void {
  // Check if key starts with "sb_" (new format indicator)
  if (key.startsWith("sb_")) {
    throw new Error(
      `Invalid service role key format: Key starts with "sb_" (new API key format). ` +
        `Service role operations require JWT format. ` +
        `Set SUPABASE_SERVICE_ROLE_KEY or SERVICE_ROLE_KEY to a JWT key from 'bunx supabase status -o env'.`,
    );
  }

  // JWT structure: header.payload.signature (exactly 2 dots)
  const parts = key.split(".");
  if (parts.length !== 3) {
    throw new Error(
      `Invalid service role key format: Key does not appear to be a JWT (expected 3 parts separated by dots, found ${parts.length}). ` +
        `Service role operations require JWT format. ` +
        `Set SUPABASE_SERVICE_ROLE_KEY or SERVICE_ROLE_KEY to a JWT key from 'bunx supabase status -o env'.`,
    );
  }
}

/**
 * Resolves environment variables lazily.
 * This function is called on first access to any env property,
 * allowing test frameworks to set up env vars before they're read.
 */
function resolveEnv(): AppEnv {
  const nodeEnv = process.env.NODE_ENV;
  const isDevelopment = (nodeEnv ?? "development") === "development";

  return {
    NODE_ENV: nodeEnv,
    PORT: process.env.PORT,
    // DEV_BYPASS_AUTH must be explicitly set - no default for security
    DEV_BYPASS_AUTH: process.env.DEV_BYPASS_AUTH,
    // AUTH_SITE_URL: OAuth redirect base URL (required for OAuth flows)
    // Falls back to localhost with configured PORT for local development only
    AUTH_SITE_URL: pick(
      process.env.AUTH_SITE_URL,
      isDevelopment
        ? `http://127.0.0.1:${process.env.PORT || "3000"}`
        : undefined,
    ),
    // DATABASE_URL: PostgreSQL connection string (legacy, kept for compatibility)
    // DB_URL is output by `bunx supabase status -o env`
    DATABASE_URL: pick(
      process.env.DATABASE_URL,
      process.env.DB_URL,
      process.env.SUPABASE_LOCAL_DB_URL,
      process.env.POSTGRES_URL,
    ),
    // SUPABASE_URL: Supabase project URL
    // Supports both SUPABASE_URL and SB_URL (Doppler naming convention)
    // API_URL is output by `bunx supabase status -o env`
    SUPABASE_URL: pick(
      process.env.SUPABASE_URL,
      process.env.SB_URL,
      process.env.API_URL,
      process.env.SUPABASE_LOCAL_URL,
    ),
    // SUPABASE_PUBLISHABLE_KEY: Supabase publishable/anonymous key
    // Supports both new format (sb_publishable_...) and legacy JWT format
    // Supports both SUPABASE_PUBLISHABLE_KEY and SB_PUBLISHABLE_KEY (Doppler naming)
    // Fallback to local Supabase keys for development
    SUPABASE_PUBLISHABLE_KEY: pick(
      process.env.SUPABASE_PUBLISHABLE_KEY,
      process.env.SB_PUBLISHABLE_KEY,
      process.env.PUBLISHABLE_KEY,
      process.env.SUPABASE_LOCAL_ANON_KEY,
      process.env.ANON_KEY,
    ),
    // SUPABASE_SERVICE_ROLE_KEY: Supabase service role key (JWT format required)
    // Used for admin operations that bypass RLS
    // Supports both SUPABASE_SERVICE_ROLE_KEY and SB_SERVICE_ROLE_KEY (Doppler naming)
    // Fallback to local Supabase service role key for development
    SUPABASE_SERVICE_ROLE_KEY: (() => {
      const key = pick(
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        process.env.SB_SERVICE_ROLE_KEY,
        process.env.SERVICE_ROLE_KEY,
        process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY,
      );

      // Runtime validation: Fail fast if key is not in JWT format
      // NOTE: Supabase JS client requires JWT format for service role operations.
      // New API key format (sb_secret_...) does not work for admin operations.
      if (key) {
        validateServiceRoleKey(key);
      }

      return key;
    })(),
    // Database connection pool tuning (postgres-js)
    DB_POOL_MAX: parseNumber(process.env.DB_POOL_MAX, "DB_POOL_MAX"),
    DB_IDLE_TIMEOUT: parseNumber(
      process.env.DB_IDLE_TIMEOUT,
      "DB_IDLE_TIMEOUT",
    ),
    DB_CONNECT_TIMEOUT: parseNumber(
      process.env.DB_CONNECT_TIMEOUT,
      "DB_CONNECT_TIMEOUT",
    ),
  };
}

// Cache for resolved env
let _resolvedEnv: AppEnv | null = null;

/**
 * Lazily-loaded environment configuration.
 * Environment variables are resolved on first property access, not at module load time.
 * This allows test frameworks like Vitest to set up env vars in setupFiles before they're read.
 */
export const env: AppEnv = new Proxy({} as AppEnv, {
  get(_target, prop: string) {
    if (_resolvedEnv === null) {
      _resolvedEnv = resolveEnv();
    }
    return _resolvedEnv[prop as keyof AppEnv];
  },
  set(_target, prop: string, value: unknown) {
    if (_resolvedEnv === null) {
      _resolvedEnv = resolveEnv();
    }
    (_resolvedEnv as Record<string, unknown>)[prop] = value;
    return true;
  },
  ownKeys() {
    if (_resolvedEnv === null) {
      _resolvedEnv = resolveEnv();
    }
    return Object.keys(_resolvedEnv);
  },
  getOwnPropertyDescriptor(_target, prop: string) {
    if (_resolvedEnv === null) {
      _resolvedEnv = resolveEnv();
    }
    return Object.getOwnPropertyDescriptor(_resolvedEnv, prop);
  },
  has(_target, prop: string) {
    if (_resolvedEnv === null) {
      _resolvedEnv = resolveEnv();
    }
    return prop in _resolvedEnv;
  },
});
