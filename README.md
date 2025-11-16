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
