import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    env: {
      // Default to local Supabase for all tests
      // Support both new API key format (sb_publishable_/sb_secret_) and legacy JWT format
      SUPABASE_URL:
        process.env.API_URL || // New format from supabase status -o env
        process.env.SUPABASE_URL ||
        "http://localhost:54321",
      SUPABASE_SERVICE_ROLE_KEY:
        process.env.SECRET_KEY || // New format (sb_secret_...)
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SERVICE_ROLE_KEY, // Legacy format (JWT)
      SUPABASE_ANON_KEY:
        process.env.PUBLISHABLE_KEY || // New format (sb_publishable_...)
        process.env.SUPABASE_ANON_KEY ||
        process.env.ANON_KEY || // Legacy format (JWT)
        process.env.SUPABASE_PUBLISHABLE_KEY,
    },
  },
});
