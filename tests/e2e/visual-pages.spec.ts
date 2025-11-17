/**
 * Visual regression tests for key pages
 * These tests capture screenshots for visual comparison
 */

import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import {
  createTestUser,
  loginAsUser,
  resetTestDb,
} from "../setup/helpers/index.js";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

/**
 * Helper to set up an authenticated page for E2E tests
 * Creates a test user, logs in, and adds session cookies to the page context
 * @param page - Playwright Page instance
 * @param role - User role (default: "member")
 * @returns The created test user
 */
async function setupAuthenticatedPage(
  page: Page,
  role: "admin" | "manager" | "member" = "member",
) {
  const testUser = await createTestUser(
    `test-${Date.now()}@example.com`,
    "TestPassword123!",
    role,
  );

  const session = await loginAsUser(testUser.email, "TestPassword123!");
  await page.context().addCookies([
    {
      name: "sb-access-token",
      value: session.access_token,
      domain: "localhost",
      path: "/",
    },
    {
      name: "sb-refresh-token",
      value: session.refresh_token,
      domain: "localhost",
      path: "/",
    },
  ]);

  return testUser;
}

test.describe("Visual Page Snapshots", () => {
  test.beforeEach(async () => {
    await resetTestDb();
  });

  test("should capture teams list page snapshot", async ({ page }) => {
    await setupAuthenticatedPage(page);

    await page.goto(`${BASE_URL}/teams`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("teams-list.png");
  });

  test("should capture profile page snapshot", async ({ page }) => {
    await setupAuthenticatedPage(page);

    await page.goto(`${BASE_URL}/profile`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("profile.png");
  });
});
