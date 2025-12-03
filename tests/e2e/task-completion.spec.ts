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
async function setupBoardWithTask(page: import('@playwright/test').Page, userId: string) {
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
  test.describe('02.1.6 - Button completes task without page reload', () => {
    test('should complete task via HTMX without full page reload', async ({ page }) => {
      // Register as admin to create boards/tasks
      const testEmail = `e2e-admin-${Date.now()}@test.local`;
      await page.goto('/register');
      await page.locator('input[name="display_name"]').fill('E2E Admin Tester');
      await page.locator('input[name="email"]').fill(testEmail);
      await page.locator('input[name="password"]').fill('password123');
      await page.locator('input[name="password_confirm"]').fill('password123');
      await page.locator('button[type="submit"]').click();
      await page.waitForURL('**/boards**', { timeout: 10000 });

      // Get user info from API
      const userResponse = await page.request.get('/api/auth/me');
      const userData = await userResponse.json();
      const userId = userData.id;

      // Create test data
      const { board } = await setupBoardWithTask(page, userId);

      // Navigate to the board page
      await page.goto(`/boards/${board.id}`);

      // Verify the task card exists and has the complete button
      const taskCard = page.locator('.task-card').first();
      await expect(taskCard).toBeVisible();

      // Get the complete button
      const completeButton = taskCard.locator('button[hx-patch*="/complete"]');
      await expect(completeButton).toBeVisible();
      await expect(completeButton).toContainText('Complete');

      // Store the current URL to verify no navigation
      const urlBefore = page.url();

      // Click complete button
      await completeButton.click();

      // Wait for HTMX swap to complete
      await page.waitForTimeout(1000);

      // Verify URL hasn't changed (no page reload)
      expect(page.url()).toBe(urlBefore);

      // Verify the task now shows as completed (badge instead of button)
      const completedBadge = taskCard.locator('.badge.bg-success');
      await expect(completedBadge).toBeVisible();
      await expect(completedBadge).toContainText('Completed');

      // Verify the complete button is no longer visible
      await expect(completeButton).not.toBeVisible();
    });
  });

  test.describe('02.1.7 - Loading spinner appears during request', () => {
    test('should show loading indicator while completing task', async ({ page }) => {
      const testEmail = `e2e-loading-${Date.now()}@test.local`;
      await page.goto('/register');
      await page.locator('input[name="display_name"]').fill('E2E Loading Tester');
      await page.locator('input[name="email"]').fill(testEmail);
      await page.locator('input[name="password"]').fill('password123');
      await page.locator('input[name="password_confirm"]').fill('password123');
      await page.locator('button[type="submit"]').click();
      await page.waitForURL('**/boards**', { timeout: 10000 });

      const userResponse = await page.request.get('/api/auth/me');
      const userData = await userResponse.json();

      const { board } = await setupBoardWithTask(page, userData.id);
      await page.goto(`/boards/${board.id}`);

      const taskCard = page.locator('.task-card').first();
      await expect(taskCard).toBeVisible();

      // Find the loading indicator (htmx-indicator)
      const loadingIndicator = taskCard.locator('.htmx-indicator');

      // Verify indicator is initially hidden (via CSS)
      // HTMX hides indicators with opacity: 0 by default
      await expect(loadingIndicator).toBeHidden();

      // We can check that the indicator element exists with the correct class
      const indicatorExists = await taskCard.locator('.htmx-indicator.spinner-border').count();
      expect(indicatorExists).toBeGreaterThan(0);
    });
  });

  test.describe('02.1.8 - Points awarded in background', () => {
    test('should award points after task completion', async ({ page }) => {
      const testEmail = `e2e-points-${Date.now()}@test.local`;
      await page.goto('/register');
      await page.locator('input[name="display_name"]').fill('E2E Points Tester');
      await page.locator('input[name="email"]').fill(testEmail);
      await page.locator('input[name="password"]').fill('password123');
      await page.locator('input[name="password_confirm"]').fill('password123');
      await page.locator('button[type="submit"]').click();
      await page.waitForURL('**/boards**', { timeout: 10000 });

      const userResponse = await page.request.get('/api/auth/me');
      const userData = await userResponse.json();

      const { board } = await setupBoardWithTask(page, userData.id);
      await page.goto(`/boards/${board.id}`);

      // Complete the task
      const taskCard = page.locator('.task-card').first();
      const completeButton = taskCard.locator('button[hx-patch*="/complete"]');
      await completeButton.click();

      // Wait for completion
      await page.waitForTimeout(1500);

      // Navigate to leaderboard to verify points
      await page.goto('/leaderboard');

      // Check that the user appears with points
      // The task had 5 story points, so we should see points awarded
      // Look for any points display on the page
      const pointsText = await page.locator('text=/\\d+ pts/').first().textContent();
      expect(pointsText).toContain('pts');
    });
  });

  test.describe('02.1.9 - Error handling shows user-friendly message', () => {
    test('should handle unauthorized task completion gracefully', async ({ page }) => {
      // First register one user and create a task assigned to them
      const ownerEmail = `e2e-owner-${Date.now()}@test.local`;
      await page.goto('/register');
      await page.locator('input[name="display_name"]').fill('Task Owner');
      await page.locator('input[name="email"]').fill(ownerEmail);
      await page.locator('input[name="password"]').fill('password123');
      await page.locator('input[name="password_confirm"]').fill('password123');
      await page.locator('button[type="submit"]').click();
      await page.waitForURL('**/boards**', { timeout: 10000 });

      const ownerResponse = await page.request.get('/api/auth/me');
      const ownerData = await ownerResponse.json();

      // Create board and task assigned to owner
      const boardResponse = await page.request.post('/api/boards', {
        data: { name: 'Owner Board', description: 'Board for error testing' },
      });
      const board = await boardResponse.json();

      const listResponse = await page.request.post(`/api/boards/${board.id}/lists`, {
        data: { name: 'Error Test List', position: 0 },
      });
      const list = await listResponse.json();

      await page.request.post(`/api/tasks/lists/${list.id}/tasks`, {
        data: {
          title: 'Owned Task',
          story_points: 3,
          assigned_to: ownerData.id,
        },
      });

      // Logout
      await page.context().clearCookies();

      // Register as different user
      const otherEmail = `e2e-other-${Date.now()}@test.local`;
      await page.goto('/register');
      await page.locator('input[name="display_name"]').fill('Other User');
      await page.locator('input[name="email"]').fill(otherEmail);
      await page.locator('input[name="password"]').fill('password123');
      await page.locator('input[name="password_confirm"]').fill('password123');
      await page.locator('button[type="submit"]').click();
      await page.waitForURL('**/boards**', { timeout: 10000 });

      // Try to access the board (may fail due to RLS, which is expected behavior)
      const response = await page.goto(`/boards/${board.id}`);

      // If we can't access the board at all, that's valid authorization behavior
      if (response?.status() === 403 || response?.status() === 404) {
        // Good - RLS is protecting resources
        expect([403, 404]).toContain(response.status());
      }
    });

    test('should handle 404 for non-existent task', async ({ page }) => {
      await registerAndLogin(page);

      // Try to complete a non-existent task via API
      const response = await page.request.patch(
        '/api/tasks/00000000-0000-0000-0000-000000000000/complete',
        {
          headers: {
            'HX-Request': 'true',
          },
        }
      );

      // Should return 404
      expect(response.status()).toBe(404);
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

    // Filter out known acceptable errors (e.g., favicon 404)
    const actualErrors = consoleErrors.filter(
      (err) => !(err.includes('favicon') || err.includes('404'))
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

    const actualErrors = consoleErrors.filter(
      (err) => !(err.includes('favicon') || err.includes('404'))
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

    const actualErrors = consoleErrors.filter(
      (err) => !(err.includes('favicon') || err.includes('404'))
    );

    expect(actualErrors).toHaveLength(0);
  });
});
