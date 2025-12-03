import path from 'node:path';
import { VitestReporter } from 'tdd-guard-vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    reporters: ['default', new VitestReporter(process.cwd())],
    globals: true,
    // Run integration test files sequentially to avoid database race conditions
    // Tests within a file still run in order, but files don't run in parallel
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: ['**/*.test.ts', '**/*.config.ts', '**/dist/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    // Use projects to configure different environments for different test types
    projects: [
      {
        // Integration tests use Node environment (no happy-dom fetch override)
        // This ensures Supabase clients use native Bun.fetch for PostgREST calls
        extends: true,
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          exclude: ['**/node_modules/**', '**/dist/**'],
          environment: 'node',
          setupFiles: ['./tests/setup/vitest-setup.ts'],
          testTimeout: 30000,
          hookTimeout: 30000,
        },
      },
      {
        // Unit tests use happy-dom for DOM simulation
        extends: true,
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts', 'tests/health.test.ts'],
          exclude: ['**/node_modules/**', '**/dist/**'],
          environment: 'happy-dom',
          setupFiles: ['./tests/setup/happydom.ts', './tests/setup/vitest-setup.ts'],
          testTimeout: 30000,
          hookTimeout: 30000,
        },
      },
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './ProjectSourceCode/src'),
    },
  },
});
