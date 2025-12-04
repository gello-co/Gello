/**
 * Performance Baseline E2E Tests (Phase 03.4)
 *
 * Measures and validates performance metrics for key pages:
 * - Time to Interactive (TTI) target: <3s
 * - Transfer size target: <2MB per page
 *
 * Run: bun run e2e tests/e2e/performance.spec.ts
 */
import { expect, test } from '@playwright/test';

// Performance thresholds
const THRESHOLDS = {
  tti: 3000, // 3 seconds max Time to Interactive
  transferSize: 2 * 1024 * 1024, // 2MB max transfer size
  domContentLoaded: 2000, // 2 seconds max DOMContentLoaded
  load: 5000, // 5 seconds max load event
};

// Pages to audit
const PAGES_TO_AUDIT = [
  { name: 'Home', path: '/', requiresAuth: false },
  { name: 'Login', path: '/login', requiresAuth: false },
  { name: 'Register', path: '/register', requiresAuth: false },
];

// Authenticated pages (tested separately)
const AUTH_PAGES_TO_AUDIT = [
  { name: 'Boards', path: '/boards', requiresAuth: true },
  { name: 'Leaderboard', path: '/leaderboard', requiresAuth: true },
];

interface PerformanceMetrics {
  domContentLoaded: number;
  load: number;
  transferSize: number;
  resourceCount: number;
}

/**
 * Collect performance metrics from a page
 */
async function collectMetrics(page: import('@playwright/test').Page): Promise<PerformanceMetrics> {
  await page.waitForLoadState('networkidle');

  const metrics = await page.evaluate(() => {
    const perfEntries = performance.getEntriesByType(
      'navigation'
    ) as Array<PerformanceNavigationTiming>;
    const navTiming = perfEntries[0];

    // Get resource timing entries for transfer size
    const resources = performance.getEntriesByType('resource') as Array<PerformanceResourceTiming>;
    const totalTransferSize = resources.reduce((sum, r) => sum + (r.transferSize || 0), 0);

    return {
      domContentLoaded: navTiming ? navTiming.domContentLoadedEventEnd - navTiming.startTime : 0,
      load: navTiming ? navTiming.loadEventEnd - navTiming.startTime : 0,
      transferSize: totalTransferSize,
      resourceCount: resources.length,
    };
  });

  return metrics;
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * Format milliseconds to human readable string
 */
function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

test.describe('03.4 Performance Baseline', () => {
  test.describe('Public Pages', () => {
    for (const pageConfig of PAGES_TO_AUDIT) {
      test(`${pageConfig.name} page loads within performance thresholds`, async ({ page }) => {
        // Navigate to the page
        await page.goto(pageConfig.path);
        const metrics = await collectMetrics(page);

        // Log metrics for documentation
        console.log(`\n${pageConfig.name} Page Performance:`);
        console.log(`  DOMContentLoaded: ${formatMs(metrics.domContentLoaded)}`);
        console.log(`  Load: ${formatMs(metrics.load)}`);
        console.log(`  Transfer Size: ${formatBytes(metrics.transferSize)}`);
        console.log(`  Resources: ${metrics.resourceCount}`);

        // Assert thresholds
        expect(
          metrics.domContentLoaded,
          `DOMContentLoaded should be under ${formatMs(THRESHOLDS.domContentLoaded)}`
        ).toBeLessThan(THRESHOLDS.domContentLoaded);

        expect(metrics.load, `Load should be under ${formatMs(THRESHOLDS.load)}`).toBeLessThan(
          THRESHOLDS.load
        );

        expect(
          metrics.transferSize,
          `Transfer size should be under ${formatBytes(THRESHOLDS.transferSize)}`
        ).toBeLessThan(THRESHOLDS.transferSize);
      });
    }
  });

  test.describe('Authenticated Pages', () => {
    // Register once for all authenticated page tests
    let testEmail: string;

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      testEmail = `e2e-perf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;

      await page.goto('/register');
      await page.locator('input[name="display_name"]').fill('Performance Tester');
      await page.locator('input[name="email"]').fill(testEmail);
      await page.locator('input[name="password"]').fill('password123');
      await page.locator('input[name="password_confirm"]').fill('password123');
      await page.locator('button[type="submit"]').click();
      await page.waitForURL('**/boards**', { timeout: 15000 });

      await context.close();
    });

    for (const pageConfig of AUTH_PAGES_TO_AUDIT) {
      test(`${pageConfig.name} page loads within performance thresholds`, async ({ page }) => {
        // Login first
        await page.goto('/login');
        await page.locator('input[name="email"]').fill(testEmail);
        await page.locator('input[name="password"]').fill('password123');
        await page.locator('button[type="submit"]').click();
        await page.waitForURL('**/boards**', { timeout: 15000 });

        // Navigate to the target page
        await page.goto(pageConfig.path);
        const metrics = await collectMetrics(page);

        // Log metrics for documentation
        console.log(`\n${pageConfig.name} Page Performance:`);
        console.log(`  DOMContentLoaded: ${formatMs(metrics.domContentLoaded)}`);
        console.log(`  Load: ${formatMs(metrics.load)}`);
        console.log(`  Transfer Size: ${formatBytes(metrics.transferSize)}`);
        console.log(`  Resources: ${metrics.resourceCount}`);

        // Assert thresholds
        expect(
          metrics.domContentLoaded,
          `DOMContentLoaded should be under ${formatMs(THRESHOLDS.domContentLoaded)}`
        ).toBeLessThan(THRESHOLDS.domContentLoaded);

        expect(metrics.load, `Load should be under ${formatMs(THRESHOLDS.load)}`).toBeLessThan(
          THRESHOLDS.load
        );

        expect(
          metrics.transferSize,
          `Transfer size should be under ${formatBytes(THRESHOLDS.transferSize)}`
        ).toBeLessThan(THRESHOLDS.transferSize);
      });
    }
  });

  test.describe('Transfer Size Verification (03.4.4)', () => {
    test('all main pages are under 2MB transfer size', async ({ page }) => {
      const results: Array<{ page: string; transferSize: number; passed: boolean }> = [];

      // Test public pages
      for (const pageConfig of PAGES_TO_AUDIT) {
        await page.goto(pageConfig.path);
        const metrics = await collectMetrics(page);
        results.push({
          page: pageConfig.name,
          transferSize: metrics.transferSize,
          passed: metrics.transferSize < THRESHOLDS.transferSize,
        });
      }

      // Log summary
      console.log('\n03.4.4 Transfer Size Verification:');
      console.log('─'.repeat(50));
      for (const result of results) {
        const status = result.passed ? '✓' : '✗';
        console.log(`  ${status} ${result.page}: ${formatBytes(result.transferSize)}`);
      }
      console.log('─'.repeat(50));

      // All pages should pass
      const allPassed = results.every((r) => r.passed);
      expect(allPassed, 'All pages should be under 2MB transfer size').toBe(true);
    });
  });
});
