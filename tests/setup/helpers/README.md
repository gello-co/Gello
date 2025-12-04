# Test Helpers

Shared utilities for Vitest tests. Import from `tests/setup/helpers`.

```ts
import { createTestUser, loginAsUser, prepareTestDb } from "../setup/helpers";
```

## Available Helpers

### auth.ts - User & Session Management

| Function                                                | Description                                               |
| ------------------------------------------------------- | --------------------------------------------------------- |
| `createTestUser(email, password, role?, displayName?)`  | Creates a test user in Supabase                           |
| `loginAsUser(email, password, options?)`                | Logs in and returns session cookies                       |
| `loginAsAdmin(options?)`                                | Logs in as seeded admin user                              |
| `generateTestEmail(label)`                              | Generates unique test email (e.g., `label-uuid@test.local`) |
| `resetAuthTestState()`                                  | Cleans up shared auth state between tests                 |

### csrf.ts - CSRF Token Handling

| Function                                      | Description                            |
| --------------------------------------------- | -------------------------------------- |
| `getCsrfToken(cookies?)`                      | Fetches CSRF token from `/api/csrf-token` |
| `setCsrfHeadersIfEnabled(req, token, cookie?)` | Adds CSRF headers to supertest request |

### db.ts - Database Setup

| Function                    | Description                                    |
| --------------------------- | ---------------------------------------------- |
| `prepareTestDb()`           | Fast cleanup via TRUNCATE + re-seed (preferred) |
| `resetTestDb()`             | Full database reset via Supabase CLI           |
| `getTestSupabaseClient()`   | Returns shared service-role Supabase client    |
| `getAnonSupabaseClient()`   | Returns shared anon-key Supabase client        |
| `seedTestData()`            | Runs `scripts/seed-simple.ts`                  |

### db-cleanup.ts - Data Cleanup

| Function                    | Description                                            |
| --------------------------- | ------------------------------------------------------ |
| `cleanupTestData(client)`   | TRUNCATEs all tables via `truncate_all_tables` RPC     |

### db-lock.ts - Parallel Test Safety

| Function                          | Description                           |
| --------------------------------- | ------------------------------------- |
| `acquireDbLock(requestId, timeoutMs?)` | File-based lock for DB operations |

### mock.ts - Mocking Utilities

| Function      | Description                       |
| ------------- | --------------------------------- |
| `mockFn(fn)`  | Type-safe cast for `vi.fn()` mocks |

## Environment Requirements

Tests require Supabase running locally:

```bash
bun run db:start    # Start Supabase
bun run db:seed     # Seed test data
bun run test            # Run tests
```

Environment variables are loaded automatically from `bunx supabase status -o env` in `vitest-setup.ts`.

## Future: Parallel Test Support

Currently tests run sequentially with shared database. For parallel execution with database isolation, Vitest supports:

- **`globalSetup`**: Run once before all workers (create template DB)
- **`pool: 'forks'`**: Isolated child processes per test file
- **Worker-scoped fixtures**: `{ scope: 'worker' }` in `test.extend()`

Example pattern for per-worker database isolation:

```ts
// vitest.config.ts
export default defineConfig({
  test: {
    pool: 'forks',
    globalSetup: './tests/setup/global-setup.ts',
  },
});

// tests/setup/global-setup.ts
export async function setup() {
  await createTemplateDatabaseWithMigrations();
}

// tests/setup/vitest-setup.ts (runs per worker)
beforeAll(async () => {
  const workerDb = await cloneTemplateDatabase(process.pid);
  process.env.DATABASE_URL = workerDb.url;
});

afterAll(async () => {
  await dropWorkerDatabase(process.pid);
});
```
