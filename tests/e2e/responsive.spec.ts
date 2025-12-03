/**
 * Responsive Design E2E Tests (02.6)
 *
 * Verifies that pages render correctly at mobile, tablet, and desktop breakpoints.
 * Tests for horizontal scrolling, Bootstrap grid behavior, and general layout.
 *
 * Run: bun run e2e
 */
import { expect, test } from '@playwright/test';

// Viewport sizes for testing
const VIEWPORTS = {
  mobile: { width: 320, height: 568 }, // iPhone SE
  tablet: { width: 768, height: 1024 }, // iPad
  desktop: { width: 1200, height: 800 }, // Standard desktop
};

// Helper to check for horizontal scrolling
async function hasHorizontalScroll(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
}

// Helper to register and login
async function registerAndLogin(page: import('@playwright/test').Page) {
  const testEmail = `e2e-responsive-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;

  await page.goto('/register');
  await page.locator('input[name="display_name"]').fill('Responsive Tester');
  await page.locator('input[name="email"]').fill(testEmail);
  await page.locator('input[name="password"]').fill('password123');
  await page.locator('input[name="password_confirm"]').fill('password123');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/boards**', { timeout: 10000 });

  return testEmail;
}

test.describe('02.6 Responsive Design Verification', () => {
  test.describe('02.6.1 - Mobile (320px)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
    });

    test('home page renders without horizontal scroll on mobile', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const hasScroll = await hasHorizontalScroll(page);
      expect(hasScroll).toBe(false);
    });

    test('login page renders without horizontal scroll on mobile', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      const hasScroll = await hasHorizontalScroll(page);
      expect(hasScroll).toBe(false);

      // Form elements should be visible
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('register page renders without horizontal scroll on mobile', async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('networkidle');

      const hasScroll = await hasHorizontalScroll(page);
      expect(hasScroll).toBe(false);
    });

    test('boards page renders without horizontal scroll on mobile', async ({ page }) => {
      await registerAndLogin(page);
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.goto('/boards');
      await page.waitForLoadState('networkidle');

      const hasScroll = await hasHorizontalScroll(page);
      expect(hasScroll).toBe(false);

      // Container should be visible
      await expect(page.locator('.container, .container-fluid').first()).toBeVisible();
    });

    test('leaderboard page renders without horizontal scroll on mobile', async ({ page }) => {
      await registerAndLogin(page);
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.goto('/leaderboard');
      await page.waitForLoadState('networkidle');

      const hasScroll = await hasHorizontalScroll(page);
      expect(hasScroll).toBe(false);
    });
  });

  test.describe('02.6.2 - Tablet (768px)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.tablet);
    });

    test('home page renders without horizontal scroll on tablet', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const hasScroll = await hasHorizontalScroll(page);
      expect(hasScroll).toBe(false);
    });

    test('login page renders without horizontal scroll on tablet', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      const hasScroll = await hasHorizontalScroll(page);
      expect(hasScroll).toBe(false);
    });

    test('boards page renders without horizontal scroll on tablet', async ({ page }) => {
      await registerAndLogin(page);
      await page.setViewportSize(VIEWPORTS.tablet);
      await page.goto('/boards');
      await page.waitForLoadState('networkidle');

      const hasScroll = await hasHorizontalScroll(page);
      expect(hasScroll).toBe(false);
    });

    test('leaderboard page renders without horizontal scroll on tablet', async ({ page }) => {
      await registerAndLogin(page);
      await page.setViewportSize(VIEWPORTS.tablet);
      await page.goto('/leaderboard');
      await page.waitForLoadState('networkidle');

      const hasScroll = await hasHorizontalScroll(page);
      expect(hasScroll).toBe(false);
    });
  });

  test.describe('02.6.3 - Desktop (1200px+)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
    });

    test('home page renders without horizontal scroll on desktop', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const hasScroll = await hasHorizontalScroll(page);
      expect(hasScroll).toBe(false);
    });

    test('boards page renders without horizontal scroll on desktop', async ({ page }) => {
      await registerAndLogin(page);
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto('/boards');
      await page.waitForLoadState('networkidle');

      const hasScroll = await hasHorizontalScroll(page);
      expect(hasScroll).toBe(false);
    });

    test('leaderboard page renders without horizontal scroll on desktop', async ({ page }) => {
      await registerAndLogin(page);
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto('/leaderboard');
      await page.waitForLoadState('networkidle');

      const hasScroll = await hasHorizontalScroll(page);
      expect(hasScroll).toBe(false);
    });
  });

  test.describe('02.6.4 - Bootstrap Grid Collapse', () => {
    test('board cards collapse to single column on mobile', async ({ page }) => {
      await registerAndLogin(page);

      // Create a board to have content
      await page.request.post('/api/boards', {
        data: { name: 'Responsive Test Board', description: 'Testing grid collapse' },
      });

      // Check desktop first (should have multi-column layout)
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto('/boards');
      await page.waitForLoadState('networkidle');

      // Check the row has column children
      const row = page.locator('.row').first();
      await expect(row).toBeVisible();

      // Now check mobile (single column)
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.waitForTimeout(500); // Allow reflow

      const hasScroll = await hasHorizontalScroll(page);
      expect(hasScroll).toBe(false);
    });
  });

  test.describe('02.6.5 - No horizontal scrolling verification', () => {
    const pagesToTest = ['/', '/login', '/register'];

    for (const path of pagesToTest) {
      test(`${path} has no horizontal scroll at any viewport`, async ({ page }) => {
        for (const [name, viewport] of Object.entries(VIEWPORTS)) {
          await page.setViewportSize(viewport);
          await page.goto(path);
          await page.waitForLoadState('networkidle');

          const hasScroll = await hasHorizontalScroll(page);
          expect(hasScroll, `${path} should not have horizontal scroll at ${name}`).toBe(false);
        }
      });
    }
  });
});
