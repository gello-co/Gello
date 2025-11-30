import { expect, test } from "@playwright/test";
import {
  createTestUser,
  loginAsUser,
  resetTestDb,
} from "../setup/helpers/index.js";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

/**
 * Admin Pages Access Verification
 *
 * This test verifies that admin users can visually access all pages in the application.
 * It uses Playwright's visual snapshot testing to capture screenshots of each page
 * for visual verification.
 *
 * Acceptance Criteria:
 * - Admin can reach all pages visually
 * - Confirmed with visual browser display
 *
 * Pages Verified:
 * - Public pages: /, /login, /register
 * - Authenticated pages: /teams, /boards, /leaderboard, /profile
 * - Admin-specific features: Teams link in navbar
 */
test.describe("Admin Pages Access Verification", () => {
  test.beforeEach(async () => {
    await resetTestDb();
  });

  test("admin can reach all pages visually", async ({
    page,
    request: _request,
  }) => {
    // Create admin user
    const adminUser = await createTestUser(
      "admin@example.com",
      "password123",
      "admin",
      "Ada Admin",
    );

    // Login as admin
    const session = await loginAsUser(adminUser.email, "password123");
    const cookies = [
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
    ];

    await page.context().addCookies(cookies);

    // List of pages to verify
    const pages = [
      { path: "/", name: "Home", requiresAuth: false },
      { path: "/login", name: "Login", requiresAuth: false },
      { path: "/register", name: "Register", requiresAuth: false },
      { path: "/teams", name: "Teams", requiresAuth: true },
      { path: "/boards", name: "Boards", requiresAuth: true },
      { path: "/leaderboard", name: "Leaderboard", requiresAuth: true },
      { path: "/profile", name: "Profile", requiresAuth: true },
    ];

    // Verify each page with visual debugging
    for (const pageInfo of pages) {
      console.log(`\n📄 Verifying ${pageInfo.name} page (${pageInfo.path})...`);

      await page.goto(`${BASE_URL}${pageInfo.path}`, {
        waitUntil: "networkidle",
      });

      // Wait for page to be fully loaded
      await page.waitForLoadState("domcontentloaded");
      await page.waitForLoadState("networkidle");

      // Wait for page title to be set (indicates page is fully rendered)
      await page.waitForFunction(
        () => {
          const title = document.title;
          return title && title.trim().length > 0;
        },
        { timeout: 5000 },
      );

      // Check page loaded successfully
      const pageTitle = await page.title();
      expect(pageTitle).toBeTruthy();
      expect(pageTitle.length).toBeGreaterThan(0);
      console.log(`  Title: ${pageTitle}`);

      // Check for error messages (should not have unauthorized/forbidden)
      const bodyText = (await page.locator("body").textContent()) || "";
      const hasError =
        bodyText.toLowerCase().includes('"error":"unauthorized"') ||
        bodyText.toLowerCase().includes('"error":"forbidden"') ||
        bodyText.toLowerCase().includes("authentication failed");

      if (pageInfo.requiresAuth) {
        expect(hasError).toBe(false);
        console.log(`  ✓ Authentication check passed`);
      }

      // Visual snapshot for verification
      // This creates a screenshot that can be compared in future runs
      await expect(page).toHaveScreenshot(
        `admin-${pageInfo.name.toLowerCase().replace(/\s+/g, "-")}.png`,
        {
          fullPage: true,
          animations: "disabled", // Disable animations for consistent screenshots
        },
      );

      console.log(
        `  ✓ ${pageInfo.name} page accessible and screenshot captured`,
      );
    }

    // Verify admin-specific features with visual debugging
    console.log("\n🔍 Verifying admin-specific features...");

    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState("networkidle");

    // Check Teams link is visible in navbar (admin-only feature)
    const teamsLink = page.locator('a[href="/teams"]');
    await expect(teamsLink).toBeVisible();
    console.log("  ✓ Teams link visible in navbar (admin-only feature)");

    // Verify admin can access teams page via navbar click
    await teamsLink.click();
    await expect(page).toHaveURL(`${BASE_URL}/teams`, { timeout: 10000 });
    await page.waitForLoadState("networkidle");
    const teamsPageTitle = await page.title();
    expect(teamsPageTitle).toContain("Teams");
    console.log("  ✓ Teams page accessible via navbar click");

    // Visual snapshot of teams page after navigation
    await expect(page).toHaveScreenshot("admin-teams-navigated.png", {
      fullPage: true,
      animations: "disabled",
    });

    // Verify admin can access a specific team if teams exist
    const teamLinks = page.locator('a[href^="/teams/"]');
    const teamCount = await teamLinks.count();
    if (teamCount > 0) {
      console.log(`  Found ${teamCount} team(s), accessing first team...`);
      await teamLinks.first().click();
      await expect(page).toHaveURL(/\/teams\/[^/]+$/, { timeout: 10000 });
      await page.waitForLoadState("networkidle");

      // Visual snapshot of team detail page
      await expect(page).toHaveScreenshot("admin-team-detail.png", {
        fullPage: true,
        animations: "disabled",
      });
      console.log("  ✓ Team detail page accessible");
    } else {
      console.log(
        "  ℹ No teams found (this is expected if database was reset)",
      );
    }

    // Verify admin can access boards with visual snapshot
    console.log("\n📋 Verifying boards access...");
    await page.goto(`${BASE_URL}/boards`, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(`${BASE_URL}/boards`);
    await expect(page).toHaveScreenshot("admin-boards-navigated.png", {
      fullPage: true,
      animations: "disabled",
    });
    console.log("  ✓ Boards page accessible");

    // Verify admin can access leaderboard with visual snapshot
    console.log("\n🏆 Verifying leaderboard access...");
    await page.goto(`${BASE_URL}/leaderboard`, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(`${BASE_URL}/leaderboard`);
    await expect(page).toHaveScreenshot("admin-leaderboard-navigated.png", {
      fullPage: true,
      animations: "disabled",
    });
    console.log("  ✓ Leaderboard page accessible");

    // Verify admin can access profile with visual snapshot
    console.log("\n👤 Verifying profile access...");
    await page.goto(`${BASE_URL}/profile`, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(`${BASE_URL}/profile`);
    await expect(page).toHaveScreenshot("admin-profile-navigated.png", {
      fullPage: true,
      animations: "disabled",
    });
    console.log("  ✓ Profile page accessible");

    console.log("\n✅ All admin pages verified successfully!");
  });
});
