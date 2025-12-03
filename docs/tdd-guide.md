# TDD Guide for Gello

This guide outlines test-driven development practices for the Gello project.

## Philosophy: Red-Green-Refactor

1. **RED**: Write a failing test first
2. **GREEN**: Write minimum code to make it pass
3. **REFACTOR**: Improve code without changing behavior

## Test Organization

```
tests/
├── unit/           # Isolated unit tests (no DB, fast)
├── integration/    # API tests with real DB
├── e2e/           # Playwright browser tests
└── setup/
    ├── helpers/   # Test utilities
    └── *.ts       # Global setup files
```

## Naming Conventions

Use **Arrange-Act-Assert** pattern with descriptive names:

```typescript
describe("TaskService", () => {
  describe("completeTask", () => {
    it("should set completed_at timestamp when task exists", async () => {
      // Arrange
      const task = await createTask({ title: "Test task" });

      // Act
      const result = await taskService.completeTask(task.id);

      // Assert
      expect(result.completed_at).toBeTruthy();
    });

    it("should throw ResourceNotFoundError when task does not exist", async () => {
      // Arrange
      const fakeId = "non-existent-id";

      // Act & Assert
      await expect(taskService.completeTask(fakeId)).rejects.toThrow(
        ResourceNotFoundError
      );
    });
  });
});
```

## Test Helpers

Import from `tests/setup/helpers`:

```typescript
import {
  createTestUser,
  loginAsUser,
  generateTestEmail,
  prepareTestDb,
  getTestSupabaseClient,
} from "../setup/helpers/index.js";
```

### Available Utilities

| Helper                            | Purpose                           |
| --------------------------------- | --------------------------------- |
| `createTestUser(email, password)` | Create a user in test DB          |
| `loginAsUser(email, password)`    | Get authenticated session         |
| `loginAsAdmin()`                  | Login as admin for elevated tests |
| `generateTestEmail(label)`        | Generate unique test email        |
| `prepareTestDb()`                 | Ensure DB is seeded and ready     |
| `resetTestDb()`                   | Reset DB to clean state           |
| `getTestSupabaseClient()`         | Get Supabase client for tests     |
| `getCsrfToken(agent)`             | Extract CSRF token for forms      |
| `mockFn(fn)`                      | Create a mock function            |

## Unit Tests

Fast, isolated tests without database:

```typescript
// tests/unit/services/points.service.test.ts
import { describe, expect, it, vi } from "vitest";
import { calculatePoints } from "@/lib/utils/points.js";

describe("calculatePoints", () => {
  it("should return story_points * 10 for task completion", () => {
    const points = calculatePoints({ story_points: 5 });
    expect(points).toBe(50);
  });
});
```

Run unit tests:

```bash
bun run test tests/unit
```

## Integration Tests

Test API endpoints with real database:

```typescript
// tests/integration/tasks.test.ts
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "@/express/app.js";
import {
  createTestUser,
  loginAsUser,
  prepareTestDb,
} from "../setup/helpers/index.js";

describe("POST /api/tasks", () => {
  let agent: request.Agent;

  beforeAll(async () => {
    await prepareTestDb();
    await createTestUser("test@example.com", "password123");
    agent = await loginAsUser("test@example.com", "password123");
  });

  it("should create a task with valid data", async () => {
    const response = await agent.post("/api/tasks/lists/list-id/tasks").send({
      title: "New Task",
      story_points: 3,
    });

    expect(response.status).toBe(201);
    expect(response.body.title).toBe("New Task");
  });

  it("should return 401 without authentication", async () => {
    const response = await request(app)
      .post("/api/tasks/lists/list-id/tasks")
      .send({ title: "Task" });

    expect(response.status).toBe(401);
  });
});
```

Run integration tests:

```bash
bun run test tests/integration
```

## Template Tests with happy-dom

Test Handlebars templates:

```typescript
// tests/unit/templates/partials.test.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Handlebars from "handlebars";
import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";

const VIEWS_DIR = resolve(process.cwd(), "ProjectSourceCode/src/express/views");

function loadPartial(name: string): HandlebarsTemplateDelegate {
  const path = resolve(VIEWS_DIR, "partials", `${name}.hbs`);
  const source = readFileSync(path, "utf-8");
  return Handlebars.compile(source);
}

function parseHTML(html: string): Document {
  const window = new Window({ url: "http://localhost" });
  window.document.body.innerHTML = html;
  return window.document as unknown as Document;
}

describe("task-card partial", () => {
  it("should render task title", () => {
    const template = loadPartial("task-card");
    const html = template({
      task: { id: "1", title: "Test Task", story_points: 5 },
      user: { role: "member" },
    });
    const doc = parseHTML(html);

    const title = doc.querySelector(".card-title");
    expect(title?.textContent).toBe("Test Task");
  });
});
```

## E2E Tests with Playwright

Full browser tests:

```typescript
// tests/e2e/auth-flow.spec.ts
import { expect, test } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("user can register and login", async ({ page }) => {
    // Navigate to registration
    await page.goto("/register");

    // Fill form
    await page.fill('[name="email"]', "newuser@test.com");
    await page.fill('[name="password"]', "password123");
    await page.click('button[type="submit"]');

    // Verify redirect to boards
    await expect(page).toHaveURL("/boards");
  });
});
```

Run E2E tests:

```bash
# Start server first
bun run start

# In another terminal
bun run e2e
```

## Running Tests

```bash
# All tests
bun run test

# Unit tests only (fast, no DB)
bun run test tests/unit

# Integration tests (requires Supabase)
bun run test tests/integration

# Single test file
bun run test tests/unit/services/points.service.test.ts

# Watch mode
bun run test:watch

# With coverage
bun run test:coverage

# CI mode (bail on first failure)
bun run test:ci
```

## Coverage Requirements

Target 80% coverage for:

- Lines
- Functions
- Branches
- Statements

View coverage report:

```bash
bun run test:coverage
open coverage/index.html
```

## Mock Mode for UI Development

Use mock services for UI development without database:

```bash
bun run dev:mock
```

Mock data is defined in `ProjectSourceCode/src/contracts/fixtures/index.ts`.

## Best Practices

1. **One assertion per test** - Makes failures easier to diagnose
2. **Descriptive test names** - Should read like documentation
3. **Independent tests** - Each test should work in isolation
4. **Clean up after tests** - Use `afterEach` to reset state
5. **Avoid implementation details** - Test behavior, not implementation
6. **Use fixtures** - Keep test data consistent and maintainable
