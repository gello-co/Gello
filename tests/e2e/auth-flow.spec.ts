import { expect, test } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

test.describe("Auth Flow", () => {
  test("should complete full auth flow: register → login → session → logout", async ({
    page,
  }) => {
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = "TestPassword123!";
    const testDisplayName = "Test User";

    // Step 1: Register
    await page.goto(`${BASE_URL}/register`);
    await expect(page.locator('input[name="email"]')).toBeVisible();
    
    // Visual snapshot: Register page
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("register-page.png");

    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="display_name"]', testDisplayName);
    await page.click('button[type="submit"]');

    // Should redirect to login or dashboard after registration
    await page.waitForURL(
      (url) => url.pathname === "/login" || url.pathname === "/dashboard",
      { timeout: 5000 },
    );

    // Step 2: Login
    if (page.url().includes("/login")) {
      // Visual snapshot: Login page
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveScreenshot("login-page.png");
      
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', testPassword);
      await page.click('button[type="submit"]');
    }

    // Should be logged in and redirected to dashboard
    await page.waitForURL((url) => url.pathname.includes("/dashboard"), {
      timeout: 5000,
    });
    await expect(page.locator("text=Dashboard")).toBeVisible();
    
    // Visual snapshot: Dashboard
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("dashboard.png");

    // Step 3: Verify session (check for user info in page)
    await expect(page.locator(`text=${testDisplayName}`)).toBeVisible();

    // Step 4: Logout
    const logoutButton = page.locator(
      'a:has-text("Logout"), button:has-text("Logout")',
    );
    if ((await logoutButton.count()) > 0) {
      await logoutButton.click();
    } else {
      // Try API logout if no UI button
      await page.goto(`${BASE_URL}/api/auth/logout`);
    }

    // Should be redirected to login or home
    await page.waitForURL(
      (url) => url.pathname === "/login" || url.pathname === "/",
      { timeout: 5000 },
    );
  });

  test("should handle invalid login credentials", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    // Visual snapshot: Login page (before error)
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("login-page-error-state.png");

    await page.fill('input[name="email"]', "invalid@example.com");
    await page.fill('input[name="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(
      page.locator("text=Invalid email or password, text=Error, text=Failed"),
    ).toBeVisible({ timeout: 3000 });
    
    // Visual snapshot: Login page with error
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("login-page-with-error.png");
  });

  test("should prevent duplicate registration", async ({ page }) => {
    const testEmail = `duplicate-${Date.now()}@example.com`;
    const testPassword = "TestPassword123!";

    // First registration
    await page.goto(`${BASE_URL}/register`);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="display_name"]', "First User");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Try to register again with same email
    await page.goto(`${BASE_URL}/register`);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="display_name"]', "Second User");
    await page.click('button[type="submit"]');

    // Should show error about existing user
    await expect(
      page.locator("text=already exists, text=Error, text=User"),
    ).toBeVisible({ timeout: 3000 });
  });
});
