# Gello Devcontainer

This devcontainer provides a fully self-contained development environment for the Gello project.

## Features

- **Bun Runtime**: Pre-installed Bun for fast JavaScript/TypeScript execution
- **Supabase CLI**: Local Supabase development support
- **Docker-in-Docker**: Required for Supabase local development
- **Playwright**: E2E testing with browser automation
- **VS Code Extensions**: Biome, Bun, Playwright, TypeScript support

## Getting Started

1. **Open in VS Code/Cursor**: Use "Reopen in Container" when prompted, or run:
   ```bash
   code --remote-containers .
   ```

2. **Wait for Fast Setup**: The post-create script automatically runs in fast mode (default):
   - Initializes Doppler CLI
   - Verifies tools (Bun, bunx, Docker)
   - Installs project dependencies
   - Installs Playwright browsers (if needed)
   - Initializes Supabase config (if needed)
   - Sets up git hooks (if .git exists)

3. **Verify Setup** (recommended):
   ```bash
   # Quick health check
   bash .devcontainer/test-devcontainer.sh

   # Full E2E workflow validation (includes test suite)
   bash .devcontainer/e2e-workflow-test.sh
   ```

4. **Start Development** (single command):
   ```bash
   bun run start
   ```
   This single command will:
   - Start Supabase local instance
   - Seed database with test data
   - Start the development server with hot reload
   - Make Playwright browsers available for MCP tools

5. **Authenticate Doppler (recommended once per container)**:
   ```bash
   doppler login --scope . --no-localhost --project gello --config dev
   ```
   This uses the browser/device flow (no long-lived token). After the CLI prints a verification code and URL, open it on your host, approve access, then run `doppler me` to confirm the container is authenticated.

6. **Access the Application**:
   - Open <http://localhost:3000>
   - Login with test users (see credentials below)

## Configuration Flags

### Fast Setup (Default)

By default, the devcontainer uses **fast setup mode**, which skips heavy operations during container creation:
- Supabase start/verification
- Database seeding
- Test execution

This allows the container to be ready in ~30-60 seconds. Full environment setup happens when you run `bun run start`.

**Metrics**: Metrics collection is enabled by default. When `FULL_SETUP_ON_CREATE=true` is set, timing metrics are saved to `/tmp/devcontainer-full-setup-metrics.json` with per-phase durations and total time.

### Full Setup (Optional)

To run the complete setup during container creation (including Supabase start, seeding, and tests), set:

```json
// In .devcontainer/devcontainer.json, add to "containerEnv":
"containerEnv": {
  "FULL_SETUP_ON_CREATE": "true",
  "FULL_SETUP_METRICS": "true"  // Metrics enabled by default
}
```

Or set environment variables before opening the container:
```bash
export FULL_SETUP_ON_CREATE=true
export FULL_SETUP_METRICS=true  # Metrics enabled by default
```

**When to use full setup:**
- CI/CD pipelines
- First-time setup verification
- Debugging container creation issues
- When you want complete verification before starting development

## Quick Start

1. **Open Container**: Use "Reopen in Container"
2. **Wait for Setup**: Fast setup completes in ~30-60 seconds
3. **Authenticate Doppler**: `bash .devcontainer/doppler-init.sh` (prompts for token if `DOPPLER_TOKEN` not set)
4. **Run Single Command**: `bun run start`
5. **Access App**: <http://localhost:3000>
6. **Login**: Use test user credentials (see below)

That's it! The single command brings up the full environment.

## Test User Credentials

All seeded users have password `password123`:

- **Admin**: `admin@example.com` (display name: Ada Admin)
- **Manager**: `manager@example.com` (display name: Alice Manager)
- **Manager**: `bob.manager@example.com` (display name: Bob Manager)
- **Member**: `member@example.com` (display name: Ivy Member)
- **Member**: `noah.member@example.com` (display name: Noah Member)

## Available Pages

**Public Pages (No Auth Required):**
- `/` - Home page
- `/login` - Login page (redirects to `/` after successful login)
- `/register` - Registration page

**Authenticated Pages (Login Required):**
- `/boards` - Boards list (all roles)
- `/boards/:id` - Board detail (all roles)
- `/teams` - Teams list (all roles, admin sees all teams)
- `/teams/:id` - Team detail (all roles)
- `/leaderboard` - Points leaderboard (all roles)
- `/profile` - User profile (all roles)

**Note:** After successful login, users are redirected to the home page (`/`), not a dashboard route. The dashboard layout is used for authenticated pages but there is no `/dashboard` route.

## MCP Tools Integration

The devcontainer is configured to work with MCP (Model Context Protocol) tools for enhanced development workflows:

### Supabase Local MCP Tools

After running `bun run start`, you can use Supabase MCP tools to:
- **List tables**: Verify database schema
- **Check seeded data**: Validate test data is present
- **Query database**: Run SQL queries directly
- **View migrations**: List applied migrations
- **Check advisors**: Security and performance recommendations

**Example workflow:**
1. Run `bun run start` (starts Supabase and seeds data)
2. Use Supabase MCP tools to verify database state
3. Check that users, teams, boards, tasks are properly seeded

### Browser/Playwright MCP Tools

Playwright browsers are installed and available for:
- **E2E testing**: Run Playwright tests against the running app
- **Browser automation**: Use MCP browser tools (`@Browser`) to:
  - Navigate pages and verify UI
  - Test interactive JavaScript features
  - Capture performance metrics (page load times)
  - Run smoke tests (login, navigation flows)

**Example workflow:**
1. Run `bun run start` (ensures Playwright browsers are available)
2. Use Browser MCP tools to:
   - Open <http://localhost:3000>
   - Login with test credentials
   - Navigate through boards, teams, leaderboard
   - Verify interactive features work correctly

## Development Commands

```bash
# Start everything (Supabase + dev server + auto-seed)
bun run start

# Development server only (Supabase must be running)
bun run dev

# Testing
bun run test:unit          # Unit tests
bun run test:integration   # Integration tests
bun run e2e                # E2E tests with Playwright
bun run e2e:ui             # Interactive E2E test UI

# Database
bun run supabase:status    # Check Supabase status
bun run supabase:reset     # Reset database
bun run seed               # Re-seed test data

# Code quality
bun run check              # Format, lint, and type check
bun run verify             # Run all checks + tests
```

## Ports

The following ports are forwarded automatically:

- `3000`: Application server (HTTP accessible)
- `54321`: Supabase API (HTTP accessible - health checks: `/health` for general API, `/auth/v1/health` for Auth service)
- `54322`: Supabase Database (PostgreSQL - not HTTP accessible, use connection string)
- `54323`: Supabase Studio (HTTP accessible - web UI for database management)
- `54324`: Supabase Inbucket (HTTP accessible - email testing interface)
- `54325`: Supabase Storage (S3-compatible API - HTTP accessible at `/storage/v1/s3`)

## Requirements

- **Docker Desktop**: Must be installed and running on the host machine
- **VS Code/Cursor**: With Remote Containers extension installed

## Development Workflow

1. **Start**:
   ```bash
   bun run start  # Single command - starts everything
   ```

2. **Login and Navigate**:
   - Open <http://localhost:3000>
   - Login with test user (see credentials above)
   - Navigate all pages to test features

3. **Make changes**:
   - Write code
   - Run `bun run check` to format and lint
   - Run `bun run test:unit` for quick feedback

4. **Before committing**:
   ```bash
   bun run verify  # Runs format, lint, and all tests
   ```

5. **Visual Testing**:
   ```bash
   bun run e2e:ui         # Interactive visual testing
   bun run visual:update  # Update snapshots after intentional UI changes
   ```

## Troubleshooting

### Docker Not Available

If Docker is not available in the container:
1. Ensure Docker Desktop is running on your host
2. The devcontainer uses Docker-in-Docker feature
3. Check Docker status: `docker ps`

### Supabase Won't Start

1. Verify Docker is running: `docker ps`
2. Check Supabase status: `bun run supabase:status`
3. Reset if needed: `bun run supabase:reset`
4. If connection issues persist, wait a few seconds and retry (Supabase may be starting up)

### Port Conflicts

If ports are already in use:
- Modify `.devcontainer/devcontainer.json` to change port mappings
- Or stop conflicting services on your host

### Test Failures

1. **Connection errors**: Ensure Supabase is running (`bun run supabase:status`)
2. **Flaky tests**: Run tests multiple times to verify stability
3. **Visual test failures**: Review diffs with `bun run e2e:ui` and update if intentional

### Environment Variables

All Supabase credentials are loaded automatically from `supabase status -o env`.
No manual `.env` file setup required for local development.

**Note**: CSRF protection is deferred to v0.2.0

### Playwright Browsers Not Available

If MCP browser tools or E2E tests fail:
1. Check if browsers are installed: `ls node_modules/@playwright`
2. Install manually: `bunx playwright install --with-deps`
3. Verify installation: `bunx playwright --version`

## Manual Setup (if devcontainer not used)

If you prefer not to use the devcontainer, install manually:

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install Supabase CLI
bunx supabase --version  # Downloads on first use

# Install dependencies
bun install

# Install Playwright browsers
bunx playwright install --with-deps
```

## Performance Notes

- **Fast** (default): Container ready in ~30-60 seconds (skips Supabase start, seeding, tests)
- **Full** (optional): Container ready in ~2-5 minutes (includes Supabase start, seeding, tests, metrics)
- **Single command start**: `bun run start` brings up full environment in ~30-60 seconds (if not already running)

Fast setup is recommended for daily development. Use full setup for CI/CD or first-time verification.
