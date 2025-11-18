# Gello

A gamified project management application with Trello-like boards, team collaboration, and points-based task completion.

![Bun Badge](https://img.shields.io/badge/Bun-000?logo=bun&logoColor=fff&style=flat-square)
![Vite Badge](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=fff&style=flat-square)
![Hono Badge](https://img.shields.io/badge/Hono-E36002?logo=hono&logoColor=fff&style=flat-square)
![Supabase Badge](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=fff&style=flat-square)
![Render Badge](https://img.shields.io/badge/Render-000?logo=render&logoColor=fff&style=flat-square)
![Cloudflare Badge](https://img.shields.io/badge/Cloudflare-F38020?logo=cloudflare&logoColor=fff&style=flat-square)
![Docker Badge](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=fff&style=flat-square)
![Biome Badge](https://img.shields.io/badge/Biome-60A5FA?logo=biome&logoColor=fff&style=flat-square)
![Postman Badge](https://img.shields.io/badge/Postman-FF6C37?logo=postman&logoColor=fff&style=flat-square)

## Quick Start

### Option 1: Devcontainer (Recommended)

1. Open project in VS Code/Cursor
2. Use "Reopen in Container" when prompted
3. Wait for setup (~30-60 seconds)
4. Run `bun run start`
5. Open http://localhost:3000
6. Login with test user: `admin@example.com` / `password123`

### Option 2: Local Setup

```bash
# Install dependencies
bun install
  
# Start development environment (Supabase + dev server)
bun run start

# Open http://localhost:3000
# Login: admin@example.com / password123
```

**What `bun run start` does:**
- Starts local Supabase instance (if not running)
- Seeds database with test data
- Starts Express.js server with hot-reload
- Server available at http://localhost:3000

## Test Users

All seeded users have password `password123`:
- **Admin**: `admin@example.com` (display name: Ada Admin)
- **Manager**: `manager@example.com` (display name: Alice Manager), `bob.manager@example.com` (display name: Bob Manager)
- **Member**: `member@example.com` (display name: Ivy Member), `noah.member@example.com` (display name: Noah Member)

## Testing

### Running Tests

```bash
# Run all tests
bun test

# Run specific test suites
bun run test:unit              # Unit tests only
bun run test:integration       # Integration tests (serial, more reliable)
bun run test:integration:parallel  # Integration tests (parallel, faster)
bun run test:e2e               # End-to-end tests with Playwright

# Run all test suites
bun run test:all
```

### Test Architecture (MVP)

**Fresh Users Per Test**: Each test automatically creates unique users using `generateTestEmail()`. This eliminates shared authentication state and ensures full test isolation.

**Real Login Flow**: Tests use the actual `/api/auth/login` endpoint, ensuring realistic behavior that matches production.

**Configurable Auth Sync Delay**: After user creation and login, a fixed delay allows Supabase Auth to sync session state. Default is 500ms, configurable via environment variable:

```bash
# Increase delay for slower environments
TEST_AUTH_SYNC_DELAY=1000 bun test

# Decrease delay for faster iteration (may cause flakiness)
TEST_AUTH_SYNC_DELAY=200 bun test
```

**Test Bypass (Local Development Only)**: For rapid iteration, you can use the test bypass option to skip session validation:

```typescript
// In your test file
const { cookies, bypassHeaders } = await loginAsUser(email, password, { bypass: true });

// Use bypass headers instead of cookies
const response = await request(app)
  .get("/api/protected")
  .set(bypassHeaders || {});
```

**Note**: Test bypass is only available in `NODE_ENV=test` and should not be used in CI.

**Serial Execution**: Integration tests run serially by default (`--concurrent 1`) for reliability. Use `test:integration:parallel` for faster runs if your environment supports it.

### Troubleshooting

- **401 Unauthorized errors**: Increase `TEST_AUTH_SYNC_DELAY` or use test bypass for local development
- **Flaky tests**: Run with `--concurrent 1` or use `test:integration` script
- **Slow test runs**: Use test bypass or run tests in parallel if stable

## Documentation

**For New Collaborators:**
1. **Start here**: [Setup Guide](docs/dev/.devOps/setup.md) - Complete environment setup and project structure
2. **Quick reference**: [Runbook](docs/dev/.devOps/RUNBOOK.md) - Essential commands for daily development
3. **Devcontainer**: [Devcontainer Guide](.devcontainer/README.md) - Self-contained development environment

**Full Documentation**: See [docs/dev/.devOps/README.md](docs/dev/.devOps/README.md) for complete documentation index

## Technology Stack

- **Runtime**: Bun (fast JavaScript runtime)
- **Framework**: Express.js with Handlebars templates
- **Database**: Supabase (PostgreSQL + Auth + RLS)
- **Validation**: Zod (type-safe schemas)
- **Testing**: Vitest (unit/integration), Playwright (E2E)
- **Linting**: Biome (fast, batteries-included)

## Contributors

- @duskoutlaw
- @ronaldjangam
- @jasmitha-22
- @PaytonJHsu
- @jnnkim1
- @wistb
