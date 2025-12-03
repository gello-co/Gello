/**
 * Auth Flow E2E Tests
 *
 * Tests the complete authentication flow using form submissions (PRG pattern).
 * Forms POST to /login and /register, which set cookies and redirect.
 *
 * Run: bun run e2e
 * Debug: bun run e2e:debug
 * Staging: bun run e2e:staging
 */
import { expect, test } from '@playwright/test';

// Detect staging environment from BASE_URL
const isStaging = process.env.BASE_URL?.includes('stg.gello.co') ?? false;

// Generate unique test user to avoid conflicts
// Uses 'e2e-stg-' prefix for staging to identify test users for future cleanup
const generateTestEmail = () => {
  const prefix = isStaging ? 'e2e-stg' : 'e2e';
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
};

test.describe('Authentication Flow', () => {
  test.describe('Login Page', () => {
    test('should display login form with all elements', async ({ page }) => {
      await page.goto('/login');

      await expect(page.locator('h2')).toContainText('Login');
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toContainText('Login');
      await expect(page.locator('a[href="/auth/discord"]')).toBeVisible();
      await expect(page.locator('a[href="/auth/github"]')).toBeVisible();
      await expect(page.locator('a[href="/register"]')).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      await page.locator('input[name="email"]').fill('nonexistent@test.local');
      await page.locator('input[name="password"]').fill('wrongpassword');
      await page.locator('button[type="submit"]').click();

      // Should stay on login page with error
      await expect(page).toHaveURL(/.*login.*/);
      await expect(page.locator('.alert-danger')).toBeVisible();
    });
  });

  test.describe('Registration Page', () => {
    test('should display registration form with all elements', async ({ page }) => {
      await page.goto('/register');

      await expect(page.locator('h2')).toContainText('Register');
      await expect(page.locator('input[name="display_name"]')).toBeVisible();
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('input[name="password_confirm"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toContainText('Register');
      await expect(page.locator('a[href="/login"]')).toBeVisible();
    });

    test('should show error for mismatched passwords', async ({ page }) => {
      await page.goto('/register');

      await page.locator('input[name="display_name"]').fill('Test User');
      await page.locator('input[name="email"]').fill(generateTestEmail());
      await page.locator('input[name="password"]').fill('password123');
      await page.locator('input[name="password_confirm"]').fill('different123');
      await page.locator('button[type="submit"]').click();

      // Should stay on register page with error
      await expect(page).toHaveURL(/.*register.*/);
      await expect(page.locator('.alert-danger')).toContainText('Passwords do not match');
    });
  });

  test.describe('Full Registration Flow (Form)', () => {
    test('should register and redirect to boards', async ({ page }) => {
      const testEmail = generateTestEmail();

      await page.goto('/register');

      await page.locator('input[name="display_name"]').fill('E2E Test User');
      await page.locator('input[name="email"]').fill(testEmail);
      await page.locator('input[name="password"]').fill('password123');
      await page.locator('input[name="password_confirm"]').fill('password123');
      await page.locator('button[type="submit"]').click();

      // Should redirect to boards
      await page.waitForURL('**/boards**', { timeout: 10000 });
      await expect(page.locator('h1')).toContainText('Boards');
    });
  });

  test.describe('Full Login Flow (Form)', () => {
    test('should login and redirect to boards', async ({ page }) => {
      const testEmail = generateTestEmail();

      // First register via form
      await page.goto('/register');
      await page.locator('input[name="display_name"]').fill('E2E Login Test');
      await page.locator('input[name="email"]').fill(testEmail);
      await page.locator('input[name="password"]').fill('password123');
      await page.locator('input[name="password_confirm"]').fill('password123');
      await page.locator('button[type="submit"]').click();
      await page.waitForURL('**/boards**', { timeout: 10000 });

      // Logout (clear cookies)
      await page.context().clearCookies();

      // Now login via form
      await page.goto('/login');
      await page.locator('input[name="email"]').fill(testEmail);
      await page.locator('input[name="password"]').fill('password123');
      await page.locator('button[type="submit"]').click();

      // Should redirect to boards
      await page.waitForURL('**/boards**', { timeout: 10000 });
      await expect(page.locator('h1')).toContainText('Boards');
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      await page.context().clearCookies();
      await page.goto('/boards');
      await expect(page).toHaveURL(/.*login.*/);
    });

    test('should access boards after authentication', async ({ page }) => {
      const testEmail = generateTestEmail();

      // Register to get authenticated
      await page.goto('/register');
      await page.locator('input[name="display_name"]').fill('E2E Protected Test');
      await page.locator('input[name="email"]').fill(testEmail);
      await page.locator('input[name="password"]').fill('password123');
      await page.locator('input[name="password_confirm"]').fill('password123');
      await page.locator('button[type="submit"]').click();
      await page.waitForURL('**/boards**', { timeout: 10000 });

      // Navigate to boards directly
      await page.goto('/boards');
      await expect(page.locator('h1')).toContainText('Boards');
    });
  });

  test.describe('API Health Check', () => {
    test('should return healthy status', async ({ request }) => {
      const response = await request.get('/api/health');
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.db).toBe(true);
    });
  });

  test.describe('Authenticated API Access', () => {
    test('should access boards API after form login', async ({ page }) => {
      const testEmail = generateTestEmail();

      // Register via form to get cookies
      await page.goto('/register');
      await page.locator('input[name="display_name"]').fill('E2E API Test');
      await page.locator('input[name="email"]').fill(testEmail);
      await page.locator('input[name="password"]').fill('password123');
      await page.locator('input[name="password_confirm"]').fill('password123');
      await page.locator('button[type="submit"]').click();
      await page.waitForURL('**/boards**', { timeout: 10000 });

      // Use page's request context (has cookies)
      const boardsResponse = await page.request.get('/api/boards');
      expect(boardsResponse.ok()).toBeTruthy();

      const boards = await boardsResponse.json();
      expect(Array.isArray(boards)).toBe(true);
    });

    test('should access teams API after form login', async ({ page }) => {
      const testEmail = generateTestEmail();

      // Register via form to get cookies
      await page.goto('/register');
      await page.locator('input[name="display_name"]').fill('E2E Teams Test');
      await page.locator('input[name="email"]').fill(testEmail);
      await page.locator('input[name="password"]').fill('password123');
      await page.locator('input[name="password_confirm"]').fill('password123');
      await page.locator('button[type="submit"]').click();
      await page.waitForURL('**/boards**', { timeout: 10000 });

      // Use page's request context (has cookies)
      const teamsResponse = await page.request.get('/api/teams');
      expect(teamsResponse.ok()).toBeTruthy();

      const teams = await teamsResponse.json();
      expect(Array.isArray(teams)).toBe(true);
    });
  });

  test.describe('Logout', () => {
    test('should logout and redirect to login', async ({ page }) => {
      const testEmail = generateTestEmail();

      // Register first
      await page.goto('/register');
      await page.locator('input[name="display_name"]').fill('E2E Logout Test');
      await page.locator('input[name="email"]').fill(testEmail);
      await page.locator('input[name="password"]').fill('password123');
      await page.locator('input[name="password_confirm"]').fill('password123');
      await page.locator('button[type="submit"]').click();
      await page.waitForURL('**/boards**', { timeout: 10000 });

      // Logout via GET (simple link)
      await page.goto('/logout');
      await expect(page).toHaveURL(/.*login.*/);

      // Verify we can't access boards anymore
      await page.goto('/boards');
      await expect(page).toHaveURL(/.*login.*/);
    });
  });
});
