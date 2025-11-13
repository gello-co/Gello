import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    setupFiles: ["./tests/setup/vitest-setup.ts"],
    // Parallelism settings for integration tests
    // Reduce parallelism to prevent connection pool exhaustion with Supabase
    // Run integration tests sequentially to avoid connection issues
    fileParallelism: false, // Disable file parallelism for integration tests
    maxConcurrency: 1, // Run one test file at a time
    testTimeout: 30000, // 30 second timeout for health checks with retries
    env: {
      // All values must be loaded from `supabase status -o env` via vitest-setup.ts
      // Support both new API key format (sb_publishable_/sb_secret_) and legacy JWT format
      // NOTE: vitest-setup.ts loads actual values from 'supabase status -o env'
      SUPABASE_URL:
        process.env.API_URL || // New format from supabase status -o env
        process.env.SUPABASE_URL,
      // Prioritize JWT format (SERVICE_ROLE_KEY) for service role operations
      SUPABASE_SERVICE_ROLE_KEY:
        process.env.SERVICE_ROLE_KEY || // Legacy format (JWT) - REQUIRED
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SECRET_KEY, // New format (sb_secret_...) - fallback only
      SUPABASE_ANON_KEY:
        process.env.PUBLISHABLE_KEY || // New format (sb_publishable_...)
        process.env.SUPABASE_ANON_KEY ||
        process.env.ANON_KEY || // Legacy format (JWT)
        process.env.SUPABASE_PUBLISHABLE_KEY,
    },
  },
});
