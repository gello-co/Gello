# Contracts - UI/UX Development

This contracts system enables **frontend development without a running backend**.

## Option 1: Mock Mode (Recommended)

Start the server with mock mode enabled:

```bash
bun run dev:mock
```

This auto-logs you in as an admin user with fixture data. No database required!

> **Note**: Mock mode currently bypasses auth and health checks. Routes that fetch data
> (leaderboard, boards, etc.) still need Supabase. Use this for auth flow testing and
> layout development. Full mock data support is being progressively added.

## Option 2: Dev Cookie Bypass

For more control, use the browser cookie bypass:

1. Start the server normally: `bun run dev`
2. Open browser DevTools → Application → Cookies
3. Add a cookie named `dev-user` with a JSON value:

```javascript
// In browser console:
document.cookie = 'dev-user=' + JSON.stringify({
  id: 'dev-001',
  email: 'dev@gello.dev',
  name: 'Dev User',
  role: 'admin',    // or 'manager' or 'member'
  teamId: 'team-001'
});
```

4. Refresh the page - you're now "logged in" as that user

## Option 3: Test Header Bypass

For API testing with tools like curl/Postman:

```bash
curl http://localhost:3000/api/teams \
  -H "X-Test-Bypass: true" \
  -H "X-Test-User-Id: my-test-user"
```

> **Security Note**: Test bypass headers are only honored in development/test
> environments (`NODE_ENV !== 'production'`). Never use in production.

---

## Available Mock Users

| Email | Role | Team |
|-------|------|------|
| admin@gello.dev | admin | Engineering |
| manager@gello.dev | manager | Engineering |
| member@gello.dev | member | Engineering |
| alice@gello.dev | member | Engineering |
| bob@gello.dev | member | Design |

Password for all: `password`

---

## Mock Data Structure

The mock system includes:

- **5 Users** - Different roles and teams
- **3 Teams** - Engineering, Design, Marketing
- **3 Boards** - Sprint 1, Backlog, Design System
- **5 Lists** - To Do, In Progress, Done, etc.
- **5 Tasks** - Various states

Edit fixtures at: `src/contracts/fixtures/index.ts`

---

## Using Services in Code

### Import Pattern

```typescript
// Get services (auto-detects mock/real based on env)
import { getServices } from '@/contracts';

const { auth, teams, boards, tasks } = getServices();

// Use services - same API whether mock or real
const allTeams = await teams.getAll();
const board = await boards.getById('board-001');
```

### Types

```typescript
import type { User, Team, Board, Task } from '@/contracts';

function renderTeamCard(team: Team) {
  // TypeScript knows the exact shape
}
```

### For Tests

```typescript
import { createTestContainer, resetMockServices } from '@/contracts';

const services = createTestContainer({ autoLogin: false });

beforeEach(() => {
  resetMockServices(services);
});
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MOCK_MODE` | `false` (prod), `true` (test) | Use mock implementations |
| `MOCK_AUTH` | `false` | Mock only auth, real data |
| `MOCK_AUTO_LOGIN` | `true` | Auto-login in mock mode |
| `DEV_COOKIE_BYPASS` | `true` (dev) | Allow dev-user cookie |

---

## Architecture

```text
contracts/
├── types/          # Domain types (User, Team, Board, etc.)
├── ports/          # Service interfaces (IAuthService, etc.)
├── adapters/
│   └── mock/       # In-memory implementations
├── fixtures/       # Static test data
├── container.ts    # Dependency injection
└── index.ts        # Public API
```

### Port/Adapter Pattern

1. **Ports** define interfaces (contracts)
2. **Adapters** implement those interfaces
3. **Container** switches between adapters based on env

This means UI code works identically with mock or real data.

---

## Notes

### Test a view with empty data

Edit `fixtures/index.ts` to empty arrays, or use the services directly:

```typescript
const services = createTestContainer();
services.teams = new MockTeamService(); // Fresh, empty
```

### Simulate being logged out

```typescript
const services = createTestContainer({ autoLogin: false });
// Now services.auth.isAuthenticated() returns false
```

### Test different roles

```typescript
import { createMockAuthService } from '@/contracts';
const auth = createMockAuthService({ role: 'member' });
```

### Use real database with mock auth

Set `MOCK_AUTH=true` (hybrid - not yet implemented).
