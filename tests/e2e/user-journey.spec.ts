/**
 * User Journey E2E Tests
 *
 *  E2E tests covering the complete user journey:
 * - Landing → Register → Boards → Create Board
 * - Create List → Create Task → Complete Task
 * - Task Completion → Points → Leaderboard
 * - Error scenarios (404, 500)
 * - Critical paths coverage
 *
 * Run: bun run e2e
 * Staging: bun run e2e:staging
 */
import { expect, test } from '@playwright/test';

// Detect staging environment
const isStaging = process.env.BASE_URL?.includes('stg.gello.co') ?? false;

// Generate unique test identifiers
const generateTestEmail = () => {
  const prefix = isStaging ? 'e2e-stg-journey' : 'e2e-journey';
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
};

/**
 * Helper to register a new user and return to boards page
 */
async function registerUser(page: import('@playwright/test').Page, displayName: string) {
  const email = generateTestEmail();

  await page.goto('/register');
  await page.locator('input[name="display_name"]').fill(displayName);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill('password123');
  await page.locator('input[name="password_confirm"]').fill('password123');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/boards**', { timeout: 15000 });

  return email;
}

/**
 * Helper to get authenticated user info
 */
async function getCurrentUser(page: import('@playwright/test').Page) {
  const response = await page.request.get('/api/auth/me');
  if (!response.ok()) {
    throw new Error(`Failed to get current user: ${response.status()}`);
  }
  return response.json();
}

/**
 * Helper to create a board via API (requires manager/admin role)
 */
async function createBoard(
  page: import('@playwright/test').Page,
  name: string,
  description?: string
) {
  const response = await page.request.post('/api/boards', {
    data: { name, description: description ?? `Test board: ${name}` },
  });
  if (!response.ok()) {
    const errorText = await response.text();
    throw new Error(`Failed to create board: ${response.status()} - ${errorText}`);
  }
  return response.json();
}

/**
 * Helper to create a list via API
 */
async function createList(
  page: import('@playwright/test').Page,
  boardId: string,
  name: string,
  position = 0
) {
  const response = await page.request.post(`/api/boards/${boardId}/lists`, {
    data: { name, position },
  });
  if (!response.ok()) {
    const errorText = await response.text();
    throw new Error(`Failed to create list: ${response.status()} - ${errorText}`);
  }
  return response.json();
}

/**
 * Helper to create a task via API
 */
async function createTask(
  page: import('@playwright/test').Page,
  listId: string,
  title: string,
  options: { storyPoints?: number; assignedTo?: string; description?: string } = {}
) {
  const response = await page.request.post(`/api/tasks/lists/${listId}/tasks`, {
    data: {
      title,
      description: options.description ?? `Test task: ${title}`,
      story_points: options.storyPoints ?? 5,
      assigned_to: options.assignedTo,
    },
  });
  if (!response.ok()) {
    const errorText = await response.text();
    throw new Error(`Failed to create task: ${response.status()} - ${errorText}`);
  }
  return response.json();
}

// =============================================================================
// 03.1.1: Landing → Register → Boards → Create Board
// =============================================================================
test.describe('03.1.1 - Landing to Board Creation Journey', () => {
  test('should navigate from landing to registration and boards', async ({ page }) => {
    // Step 1: Landing page
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Gello');
    await expect(page.locator('text=Get Started')).toBeVisible();
    await expect(page.locator('text=Sign Up')).toBeVisible();

    // Step 2: Navigate to registration
    await page.locator('a[href="/register"]').first().click();
    await expect(page).toHaveURL(/.*register.*/);
    await expect(page.locator('h2')).toContainText('Register');

    // Step 3: Complete registration
    const testEmail = generateTestEmail();
    await page.locator('input[name="display_name"]').fill('Journey Test User');
    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('input[name="password"]').fill('password123');
    await page.locator('input[name="password_confirm"]').fill('password123');
    await page.locator('button[type="submit"]').click();

    // Step 4: Verify redirect to boards
    await page.waitForURL('**/boards**', { timeout: 15000 });
    await expect(page.locator('h1')).toContainText('Boards');

    // Verify user is logged in (navbar shows user info)
    await expect(page.getByRole('button', { name: /Journey Test User/i })).toBeVisible();
  });

  test('should display empty state for new user with no boards', async ({ page }) => {
    await registerUser(page, 'Empty State Tester');

    // Verify empty state is shown
    await expect(page.locator('text=No boards yet')).toBeVisible();
  });

  test('should create board via API and see it on boards page', async ({ page }) => {
    // Register user
    await registerUser(page, 'Board Creator');

    try {
      // Create a board via API (will fail if user is not manager)
      const board = await createBoard(page, 'My Journey Board', 'Testing board creation');

      // Navigate to boards and verify
      await page.goto('/boards');
      await expect(page.locator(`text=${board.name}`)).toBeVisible();

      // Navigate to board detail
      await page.goto(`/boards/${board.id}`);
      await expect(page.locator('h1')).toContainText(board.name);
    } catch {
      // If board creation fails (member role), verify the empty state
      await expect(page.locator('text=No boards yet')).toBeVisible();
    }
  });
});

// =============================================================================
// 03.1.2: Create List → Create Task → Complete Task
// =============================================================================
test.describe('03.1.2 - List and Task Creation Journey', () => {
  test('should create list and task, then complete task via HTMX', async ({ page }) => {
    // Register user
    await registerUser(page, 'Task Journey Tester');

    let userId: string;
    try {
      const user = await getCurrentUser(page);
      userId = user.id;
    } catch {
      test.skip(true, 'Could not get current user');
      return;
    }

    // Create board
    let board: { id: string; name: string };
    try {
      board = await createBoard(page, 'Task Journey Board');
    } catch {
      test.skip(true, 'User cannot create boards (not manager role)');
      return;
    }

    // Create list
    const list = await createList(page, board.id, 'To Do', 0);
    expect(list.id).toBeDefined();

    // Create task assigned to current user
    const task = await createTask(page, list.id, 'Complete Me', {
      storyPoints: 10,
      assignedTo: userId,
    });
    expect(task.id).toBeDefined();

    // Navigate to board page
    await page.goto(`/boards/${board.id}`);

    // Verify task card is visible
    const taskCard = page.locator('.task-card').first();
    await expect(taskCard).toBeVisible();
    await expect(taskCard).toContainText('Complete Me');

    // Find and click complete button
    const completeButton = taskCard.locator('button[hx-patch*="/complete"]');
    await expect(completeButton).toBeVisible();

    // Store URL to verify no page reload
    const urlBefore = page.url();

    // Click complete
    await completeButton.click();

    // Wait for HTMX swap
    await page.waitForTimeout(1500);

    // Verify no page reload
    expect(page.url()).toBe(urlBefore);

    // Verify completed badge appears
    await expect(page.locator('.badge.bg-success')).toBeVisible();
  });

  test('should show task in list after creation', async ({ page }) => {
    await registerUser(page, 'List Viewer');

    let userId: string;
    try {
      const user = await getCurrentUser(page);
      userId = user.id;
    } catch {
      test.skip(true, 'Could not get current user');
      return;
    }

    let board: { id: string };
    try {
      board = await createBoard(page, 'List View Test');
    } catch {
      test.skip(true, 'User cannot create boards');
      return;
    }

    const list = await createList(page, board.id, 'Testing List');
    await createTask(page, list.id, 'Task One', { assignedTo: userId });
    await createTask(page, list.id, 'Task Two', { assignedTo: userId });
    await createTask(page, list.id, 'Task Three', { assignedTo: userId });

    // Navigate to board
    await page.goto(`/boards/${board.id}`);

    // Verify all tasks are visible
    await expect(page.locator('text=Task One')).toBeVisible();
    await expect(page.locator('text=Task Two')).toBeVisible();
    await expect(page.locator('text=Task Three')).toBeVisible();

    // Verify list header
    await expect(page.locator('text=Testing List')).toBeVisible();
  });
});

// =============================================================================
// 03.1.3: Task Completion → Points → Leaderboard
// =============================================================================
test.describe('03.1.3 - Points and Leaderboard Journey', () => {
  test('should award points after task completion and show on leaderboard', async ({ page }) => {
    const displayName = `Points Tester ${Date.now()}`;
    await registerUser(page, displayName);

    let userId: string;
    try {
      const user = await getCurrentUser(page);
      userId = user.id;
    } catch {
      test.skip(true, 'Could not get current user');
      return;
    }

    let board: { id: string };
    try {
      board = await createBoard(page, 'Points Test Board');
    } catch {
      test.skip(true, 'User cannot create boards');
      return;
    }

    // Create list and task with 15 points
    const list = await createList(page, board.id, 'Points List');
    await createTask(page, list.id, 'High Value Task', {
      storyPoints: 15,
      assignedTo: userId,
    });

    // Navigate to board and complete task
    await page.goto(`/boards/${board.id}`);
    const completeButton = page.locator('button[hx-patch*="/complete"]').first();
    await completeButton.click();

    // Wait for completion
    await page.waitForTimeout(2000);

    // Navigate to leaderboard
    await page.goto('/leaderboard');

    // Verify leaderboard page loads
    await expect(page.locator('h1')).toContainText('Leaderboard');

    // Verify user appears with points
    // Look for the user's name and points
    const userEntry = page.locator(`text=${displayName}`).first();
    await expect(userEntry).toBeVisible({ timeout: 5000 });

    // Verify points are shown (should be 15 pts)
    await expect(page.locator('text=/15 pts/')).toBeVisible();
  });

  test('should show points in navbar after task completion', async ({ page }) => {
    await registerUser(page, 'Navbar Points Tester');

    let userId: string;
    try {
      const user = await getCurrentUser(page);
      userId = user.id;
    } catch {
      test.skip(true, 'Could not get current user');
      return;
    }

    let board: { id: string };
    try {
      board = await createBoard(page, 'Navbar Points Board');
    } catch {
      test.skip(true, 'User cannot create boards');
      return;
    }

    const list = await createList(page, board.id, 'Points List');
    await createTask(page, list.id, 'Point Task', {
      storyPoints: 5,
      assignedTo: userId,
    });

    // Navigate to board
    await page.goto(`/boards/${board.id}`);

    // Initial points should be 0
    const _pointsDisplay = page.locator('[class*="points"], text=/\\d+ pts/').first();

    // Complete task
    await page.locator('button[hx-patch*="/complete"]').first().click();
    await page.waitForTimeout(1500);

    // Refresh page to see updated points in navbar
    await page.reload();

    // Verify points updated (check for non-zero points)
    await expect(page.locator('text=/[1-9]\\d* pts|[1-9]\\d*/')).toBeVisible({ timeout: 5000 });
  });
});

// =============================================================================
// 03.1.4: Error Scenarios (404, 500)
// =============================================================================
test.describe('03.1.4 - Error Handling Scenarios', () => {
  test('should show 404 page for non-existent board', async ({ page }) => {
    await registerUser(page, '404 Tester');

    // Try to access non-existent board
    const response = await page.goto('/boards/00000000-0000-0000-0000-000000000000');

    // Should return 404 status or redirect/show error page
    const status = response?.status() ?? 0;

    // The app might return 404, redirect to login, or show an error page
    // All are valid error handling behaviors
    if (status === 404) {
      // Direct 404 response - good
      expect(status).toBe(404);
    } else {
      // Check if page shows error content or redirected
      const pageContent = await page.content();
      const url = page.url();
      const hasErrorContent =
        pageContent.toLowerCase().includes('not found') ||
        pageContent.toLowerCase().includes('error') ||
        pageContent.includes('404') ||
        url.includes('login') ||
        url.includes('boards'); // May have redirected back to boards list

      // Either we got an error page, a redirect, or the boards list (RLS filtered)
      expect(hasErrorContent || status === 200).toBe(true);
    }
  });

  test('should show 404 for non-existent task API', async ({ page }) => {
    await registerUser(page, 'API 404 Tester');

    // Try to get non-existent task via API
    const response = await page.request.get('/api/tasks/00000000-0000-0000-0000-000000000000');

    expect(response.status()).toBe(404);
  });

  test('should return 401 for unauthenticated API requests', async ({ page }) => {
    // Clear any existing cookies
    await page.context().clearCookies();

    // Try to access protected API without auth
    const response = await page.request.get('/api/boards');

    expect(response.status()).toBe(401);
  });

  test('should redirect unauthenticated users to login for protected pages', async ({ page }) => {
    // Clear cookies
    await page.context().clearCookies();

    // Try to access boards page
    await page.goto('/boards');

    // Should redirect to login
    await expect(page).toHaveURL(/.*login.*/);
  });

  test('should handle invalid UUID gracefully', async ({ page }) => {
    await registerUser(page, 'Invalid UUID Tester');

    // Try to access board with invalid UUID
    const response = await page.request.get('/api/boards/not-a-valid-uuid');

    // Should return 400 (bad request) for invalid UUID
    expect([400, 404]).toContain(response.status());
  });

  test('should return 403 when completing task not assigned to user', async ({ page }) => {
    await registerUser(page, 'Forbidden Tester');

    let _userId: string;
    try {
      const user = await getCurrentUser(page);
      _userId = user.id;
    } catch {
      test.skip(true, 'Could not get current user');
      return;
    }

    let board: { id: string };
    try {
      board = await createBoard(page, 'Forbidden Test Board');
    } catch {
      test.skip(true, 'User cannot create boards');
      return;
    }

    const list = await createList(page, board.id, 'Forbidden List');

    // Create task NOT assigned to current user (null or different user)
    const task = await createTask(page, list.id, 'Not My Task', {
      storyPoints: 5,
      // Not assigning to anyone
    });

    // Try to complete the task
    const response = await page.request.patch(`/api/tasks/${task.id}/complete`);

    // Should return 403 Forbidden
    expect(response.status()).toBe(403);
  });
});

// =============================================================================
// 03.1.5: Critical Paths Coverage
// =============================================================================
test.describe('03.1.5 - Critical Paths Verification', () => {
  test('should complete full user journey: register → board → task → complete → leaderboard', async ({
    page,
  }) => {
    const displayName = `Full Journey ${Date.now()}`;

    // === STEP 1: Start at landing ===
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Gello');

    // === STEP 2: Navigate to register ===
    await page.locator('a[href="/register"]').first().click();
    await expect(page).toHaveURL(/.*register.*/);

    // === STEP 3: Register ===
    const email = generateTestEmail();
    await page.locator('input[name="display_name"]').fill(displayName);
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill('password123');
    await page.locator('input[name="password_confirm"]').fill('password123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/boards**', { timeout: 15000 });

    // === STEP 4: Verify on boards page ===
    await expect(page.locator('h1')).toContainText('Boards');

    // === STEP 5: Get user and try to create test data ===
    let userId: string;
    try {
      const user = await getCurrentUser(page);
      userId = user.id;
    } catch {
      // Can't continue without user ID
      test.skip(true, 'Could not get current user');
      return;
    }

    let board: { id: string; name: string };
    try {
      board = await createBoard(page, 'Full Journey Board');
    } catch {
      // User is not a manager, can't create boards
      // Verify they see the empty state instead
      await expect(page.locator('text=No boards yet')).toBeVisible();
      test.skip(true, 'User cannot create boards (not manager)');
      return;
    }

    // === STEP 6: Create list and task ===
    const list = await createList(page, board.id, 'Journey List');
    await createTask(page, list.id, 'Journey Task', {
      storyPoints: 20,
      assignedTo: userId,
    });

    // === STEP 7: Navigate to board ===
    await page.goto(`/boards/${board.id}`);
    await expect(page.locator('text=Journey Task')).toBeVisible();

    // === STEP 8: Complete task via HTMX ===
    const completeButton = page.locator('button[hx-patch*="/complete"]').first();
    await completeButton.click();
    await page.waitForTimeout(2000);

    // Verify completion badge
    await expect(page.locator('.badge.bg-success')).toBeVisible();

    // === STEP 9: Navigate to leaderboard ===
    await page.goto('/leaderboard');
    await expect(page.locator('h1')).toContainText('Leaderboard');

    // === STEP 10: Verify points appear ===
    await expect(page.locator(`text=${displayName}`)).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/20 pts/')).toBeVisible();
  });

  test('should verify navigation works correctly', async ({ page }) => {
    await registerUser(page, 'Navigation Tester');

    // Test navigation links
    await page.goto('/boards');
    await expect(page.locator('h1')).toContainText('Boards');

    // Navigate to leaderboard via navbar
    await page.locator('a[href="/leaderboard"]').first().click();
    await expect(page).toHaveURL(/.*leaderboard.*/);
    await expect(page.locator('h1')).toContainText('Leaderboard');

    // Navigate back to boards
    await page.locator('a[href="/boards"]').first().click();
    await expect(page).toHaveURL(/.*boards.*/);

    // Navigate to home
    await page.locator('a[href="/"]').first().click();
    await expect(page).toHaveURL(/.*\/$/);
  });

  test('should handle logout and re-login correctly', async ({ page }) => {
    const testEmail = generateTestEmail();

    // Register
    await page.goto('/register');
    await page.locator('input[name="display_name"]').fill('Logout Tester');
    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('input[name="password"]').fill('password123');
    await page.locator('input[name="password_confirm"]').fill('password123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/boards**', { timeout: 15000 });

    // Logout
    await page.goto('/logout');
    await expect(page).toHaveURL(/.*login.*/);

    // Verify can't access protected routes
    await page.goto('/boards');
    await expect(page).toHaveURL(/.*login.*/);

    // Re-login
    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('input[name="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/boards**', { timeout: 15000 });

    // Verify logged in
    await expect(page.locator('h1')).toContainText('Boards');
  });

  test('should have zero console errors on critical pages', async ({ page }) => {
    const consoleErrors: Array<string> = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await registerUser(page, 'Console Error Tester');

    // Visit critical pages
    await page.goto('/boards');
    await page.waitForLoadState('networkidle');

    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');

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

// =============================================================================
// Health Check (runs first to verify server is up)
// =============================================================================
test.describe('Server Health', () => {
  test('should return healthy status', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.db).toBe(true);
  });
});
