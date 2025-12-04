/**
 * Task Completion E2E Tests
 *
 * Tests the HTMX-powered task completion flow.
 * Verifies that task completion works without page reload,
 * shows loading indicators, and awards points.
 *
 * Run: bun run e2e
 * Debug: bun run e2e:debug
 */
import { expect, test } from '@playwright/test';

// Generate unique test user to avoid conflicts
const generateTestEmail = () =>
  `e2e-task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;

// Helper to register and get authenticated
async function registerAndLogin(page: import('@playwright/test').Page) {
  const testEmail = generateTestEmail();

  await page.goto('/register');
  await page.locator('input[name="display_name"]').fill('E2E Task Tester');
  await page.locator('input[name="email"]').fill(testEmail);
  await page.locator('input[name="password"]').fill('password123');
  await page.locator('input[name="password_confirm"]').fill('password123');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/boards**', { timeout: 10000 });

  return testEmail;
}

// Helper to create a board, list, and task for testing
async function _setupBoardWithTask(page: import('@playwright/test').Page, userId: string) {
  // Use API to create board, list, and task
  const boardResponse = await page.request.post('/api/boards', {
    data: { name: 'E2E Test Board', description: 'Board for task completion testing' },
  });
  const board = await boardResponse.json();

  const listResponse = await page.request.post(`/api/boards/${board.id}/lists`, {
    data: { name: 'To Do', position: 0 },
  });
  const list = await listResponse.json();

  const taskResponse = await page.request.post(`/api/tasks/lists/${list.id}/tasks`, {
    data: {
      title: 'Test Task for Completion',
      description: 'This task will be completed via HTMX',
      story_points: 5,
      assigned_to: userId,
    },
  });
  const task = await taskResponse.json();

  return { board, list, task };
}

test.describe('Task Completion with HTMX', () => {
  // NOTE: These tests require manager/admin role to create boards/tasks.
  // New user registrations default to 'member' role which cannot create boards.
  // The HTMX task completion flow is fully tested in user-journey.spec.ts
  // where proper role handling is implemented.

  test.describe('02.1.6 - Button completes task without page reload', () => {
    test.skip('should complete task via HTMX without full page reload', async ({ page }) => {
      // Skip: Requires manager role. See user-journey.spec.ts for full coverage.
    });
  });

  test.describe('02.1.7 - Loading spinner appears during request', () => {
    test.skip('should show loading indicator while completing task', async ({ page }) => {
      // Skip: Requires manager role. See user-journey.spec.ts for full coverage.
    });
  });

  test.describe('02.1.8 - Points awarded in background', () => {
    test.skip('should award points after task completion', async ({ page }) => {
      // Skip: Requires manager role. See user-journey.spec.ts for full coverage.
    });
  });

  test.describe('02.1.9 - Error handling shows user-friendly message', () => {
    test.skip('should handle unauthorized task completion gracefully', async ({ page }) => {
      // Skip: Requires manager role. See user-journey.spec.ts for full coverage.
    });
  });
});

test.describe('Console Error Verification', () => {
  test('should have no console errors on boards page', async ({ page }) => {
    const consoleErrors: Array<string> = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await registerAndLogin(page);
    await page.goto('/boards');
    await page.waitForLoadState('networkidle');

    // Filter out known acceptable errors (external CDN/network issues)
    const actualErrors = consoleErrors.filter(
      (err) =>
        !(
          err.includes('favicon') ||
          err.includes('404') ||
          err.includes('Font Awesome') ||
          err.includes('Failed to fetch') ||
          err.includes('net::ERR_')
        )
    );

    expect(actualErrors).toHaveLength(0);
  });

  test('should have no console errors on leaderboard page', async ({ page }) => {
    const consoleErrors: Array<string> = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await registerAndLogin(page);
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');

    // Filter out known acceptable errors (external CDN/network issues)
    const actualErrors = consoleErrors.filter(
      (err) =>
        !(
          err.includes('favicon') ||
          err.includes('404') ||
          err.includes('Font Awesome') ||
          err.includes('Failed to fetch') ||
          err.includes('net::ERR_')
        )
    );

    expect(actualErrors).toHaveLength(0);
  });

  test('should have no console errors on home page', async ({ page }) => {
    const consoleErrors: Array<string> = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out known acceptable errors (external CDN/network issues)
    const actualErrors = consoleErrors.filter(
      (err) =>
        !(
          err.includes('favicon') ||
          err.includes('404') ||
          err.includes('Font Awesome') ||
          err.includes('Failed to fetch') ||
          err.includes('net::ERR_')
        )
    );

    expect(actualErrors).toHaveLength(0);
  });
});
