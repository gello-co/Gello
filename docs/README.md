# Gello

A Kanban-style task management application with gamification features.

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (v1.0+)
- [Docker](https://docker.com/) (for local Supabase)

### Option 1: Full Setup

```bash
# Install dependencies
bun install

# Authenticate with Doppler (needs access to gello project)
doppler login
doppler setup

# Start development server (Supabase + app)
bun run start
```

### Option 2: Mock Mode (Quick Testing)

```bash
# No database required - uses mock data
bun install
bun run dev:mock
```

### Option 3: Local Supabase Only

```bash
bun install
bunx supabase start
# Fill in .env from `bunx supabase status -o env`
bun --hot ProjectSourceCode/src/index.ts
```

## Development Commands

| Command               | Description                                        |
| --------------------- | -------------------------------------------------- |
| `bun run start`       | Start full dev environment (Supabase + Doppler)    |
| `bun run start:fresh` | Start with database reset                          |
| `bun run dev:mock`    | Mock mode (no external services)                   |
| `bun run dev`         | Dev server with Doppler (assumes Supabase running) |
| `bun run test`        | Run all tests                                      |
| `bun run test:watch`  | Run tests in watch mode                            |
| `bun run typecheck`   | TypeScript type checking                           |
| `bun run check`       | Format and lint                                    |
| `bun run e2e`         | Run Playwright e2e tests                           |

## Database Commands

| Command            | Description                         |
| ------------------ | ----------------------------------- |
| `bun run db:start` | Start local Supabase                |
| `bun run db:stop`  | Stop local Supabase                 |
| `bun run db:reset` | Reset database (reapply migrations) |
| `bun run db:seed`  | Seed database with test data        |
| `bun run db:types` | Generate TypeScript types           |

## Environment Management

This project uses [Doppler](https://doppler.com) for secret management:

- **dev**: Local development
- **stg**: Staging environment
- **prd**: Production environment

```bash
# Switch environments
bun run doppler:dev -- <command>
bun run doppler:stg -- <command>
bun run doppler:prd -- <command>

# Run with specific environment
bun run start:stg  # Start with staging config
bun run start:prd  # Start with production config
```

## Documentation

- [Supabase & Doppler Setup Guide](docs/setup/supabase-doppler-setup.md)
- [TDD Guide](docs/tdd-guide.md)
- [Environment Variables](.env.example)

## Project Structure

```
gello/
├── ProjectSourceCode/src/    # Application source code
│   ├── express/              # Express routes, middleware, views
│   ├── lib/                  # Domain helpers, database, services
│   └── types/                # TypeScript types
├── supabase/                 # Supabase configuration
│   ├── migrations/           # Database migrations
│   └── seed.sql              # Seed data
├── tests/                    # Test files
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   └── e2e/                  # End-to-end tests
├── docs/                     # Documentation
└── scripts/                  # Helper scripts
```
