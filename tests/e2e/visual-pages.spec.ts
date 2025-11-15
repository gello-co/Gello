/**
 * Visual regression tests for key pages
 * These tests capture screenshots for visual comparison
 */

import { expect, test } from "@playwright/test";
import { createTestUser, loginAsUser, resetTestDb } from "../setup/helpers.js";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

test.describe("Visual Page Snapshots", () => {
  test.beforeEach(async () => {
    await resetTestDb();
  });

  test("should capture teams list page snapshot", async ({ page }) => {
    const testUser = await createTestUser(
      `test-${Date.now()}@example.com`,
      "TestPassword123!",
      "member",
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

    await page.goto(`${BASE_URL}/teams`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("teams-list.png");
  });

  test("should capture profile page snapshot", async ({ page }) => {
    const testUser = await createTestUser(
      `test-${Date.now()}@example.com`,
      "TestPassword123!",
      "member",
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

    await page.goto(`${BASE_URL}/profile`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("profile.png");
  });
});
