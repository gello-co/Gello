# Gello Devcontainer

This devcontainer provides a fully self-contained development environment for the Gello project.

## Features

- **Bun Runtime**: Pre-installed Bun for fast JavaScript/TypeScript execution
- **Supabase CLI**: Local Supabase development support
- **Docker-in-Docker**: Required for Supabase local development
- **Playwright**: E2E testing with browser automation
- **VS Code Extensions**: Biome, Bun, Playwright, TypeScript support

## Getting Started

1. **Open in VS Code**: Use "Reopen in Container" when prompted, or run:
   ```bash
   code --remote-containers .
   ```

2. **Wait for Setup**: The post-create script will automatically:
   - Install Bun
   - Install Supabase CLI
   - Install Playwright browsers
   - Install project dependencies
   - Setup git hooks (if .git directory exists)
   - Start Supabase local instance
   - Verify Supabase connection

3. **Quick Start Commands**:
   ```bash
   # Verify setup
   bun run verify          # Run all checks (format, lint, tests)
   
   # Development
   bun run dev             # Start dev server (with hot reload)
   bun run supabase:status # Check Supabase status
   
   # Testing
   bun run test:unit       # Unit tests only
   bun run test:integration # Integration tests
   bun run e2e            # E2E tests
   bun run e2e:ui         # E2E tests with interactive UI
   bun run visual:update  # Update visual snapshots
   
   # Database
   bun run supabase:reset  # Reset database
   bun run reset-env      # Reset DB and reload env vars
   ```

## Ports

The following ports are forwarded automatically:

- `3000`: Application server
- `54321`: Supabase API
- `54322`: Supabase Database
- `54323`: Supabase Studio
- `54324`: Supabase Inbucket (email testing)
- `54325`: Supabase Storage

## Requirements

- **Docker Desktop**: Must be installed and running on the host machine
- **VS Code**: With Remote Containers extension installed

## Daily Development Workflow

1. **Start your day**:
   ```bash
   bun run supabase:status  # Verify Supabase is running
   ```

2. **Make changes**:
   - Write code
   - Run `bun run check` to format and lint
   - Run `bun run test:unit` for quick feedback

3. **Before committing**:
   ```bash
   bun run verify  # Runs format, lint, and all tests
   ```

4. **Visual Testing**:
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

## Manual Setup (if devcontainer not used)

If you prefer not to use the devcontainer, install manually:

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install Supabase CLI
npm install -g supabase

# Install dependencies
bun install

# Install Playwright browsers
bunx playwright install --with-deps
```





