import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Ensure proper ESM module resolution for node_modules
    conditions: ["import", "module", "browser", "default"],
  },
  ssr: {
    // Process zod and other ESM modules through Vite's transform pipeline
    noExternal: ["zod"],
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/e2e/**", // Exclude Playwright E2E tests (use `bun run e2e` instead)
      "**/*.spec.ts", // Exclude all .spec.ts files (Playwright convention)
    ],
    setupFiles: ["./tests/setup/vitest-setup.ts"],
    // Parallelism settings for integration tests
    // Limited parallelism to balance speed with connection pool management
    // Tests use shared client pool to prevent connection exhaustion
    fileParallelism: true, // Enable file parallelism for faster test execution
    maxConcurrency: 2, // Run up to 2 test files concurrently (increased from 1)
    testTimeout: 30000, // 30 second timeout for health checks with retries
    // Environment variables are populated by vitest-setup.ts (runs before tests)
    // The setup file loads values from 'supabase status -o env' and sets process.env
    // Test code reads from process.env directly, so no need to duplicate fallbacks here
    // Developers can override by exporting variables before running tests:
    //   export SUPABASE_URL=http://localhost:54321 && bun run test:integration
    env: {
      // Pass through any pre-existing environment variables (e.g., from CI or shell exports)
      // vitest-setup.ts will populate these if not already set
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    },
  },
});
