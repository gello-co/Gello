import { expect, test } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

/**
 * CSRF Protection Verification Tests
 *
 * NOTE: These tests are skipped because CSRF protection is currently disabled
 * (deferred to v0.2.0). The CSRF middleware is commented out in server/app.ts.
 *
 * When CSRF protection is re-enabled in v0.2.0:
 * 1. Remove the .skip() from test.describe
 * 2. Ensure CSRF middleware is active in server/app.ts
 * 3. Verify CSRF input fields exist in login/register forms
 * 4. Verify /api/csrf-debug endpoint exists
 *
 * These tests validate:
 * - CSRF token generation and validation
 * - Cookie-token matching (Double Submit Cookie Pattern)
 * - Error handling for missing/invalid tokens
 */
test.describe.skip("CSRF Protection Verification", () => {
  test("CSRF debug endpoint works and shows correct cookie name", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/api/csrf-debug`);
    const response = await page.textContent("body");
    const data = JSON.parse(response || "{}");

    // Cookie name must be "csrf"
    expect(data.csrfCookie.name).toBe("csrf");
    expect(data.cookieSettings.sameSite).toBe("lax");
  });

  test("Login page includes CSRF token in form", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    const csrfInput = page.locator('input[name="_csrf"]');
    // CSRF token should be present (hidden input is correct for security)
    await expect(csrfInput).toBeAttached();
    const token = await csrfInput.getAttribute("value");
    expect(token).toBeTruthy();
    expect(token?.length).toBeGreaterThan(0);
  });

  test("CSRF error handling works correctly", async ({ request }) => {
    // Make request without CSRF token
    const response = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: "admin@example.com", password: "password123" },
    });

    // Missing CSRF token must return 403 with error 'CSRF token validation failed'
    // and debug hint containing 'CSRF cookie'
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("CSRF token validation failed");
    expect(body.debug).toBeDefined();
    expect(body.debug.hint).toContain("CSRF cookie");
  });

  test("Login with valid CSRF token passes validation", async ({
    page,
    request,
  }) => {
    // Get CSRF token from login page
    await page.goto(`${BASE_URL}/login`);
    const csrfToken = await page
      .locator('input[name="_csrf"]')
      .getAttribute("value");
    const cookies = await page.context().cookies();
    const csrfCookie = cookies.find((c) => c.name === "csrf");

    expect(csrfToken).toBeTruthy();
    expect(csrfCookie).toBeTruthy();

    // Try login with CSRF token
    const response = await request.post(`${BASE_URL}/api/auth/login`, {
      headers: {
        "x-csrf-token": csrfToken || "",
        cookie: cookies.map((c) => `${c.name}=${c.value}`).join("; "),
      },
      data: { email: "admin@example.com", password: "password123" },
    });

    // Should pass CSRF validation (may fail on auth/Supabase, but not CSRF)
    // If it's 403, it's a CSRF error. If it's 500, it passed CSRF but failed elsewhere
    expect([200, 401, 500]).toContain(response.status());
    expect(response.status()).not.toBe(403);
  });

  test("Cookie and token values match (secret consistency)", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/login`);
    const csrfToken = await page
      .locator('input[name="_csrf"]')
      .getAttribute("value");

    // Check debug endpoint
    await page.goto(`${BASE_URL}/api/csrf-debug`);
    const response = await page.textContent("body");
    const data = JSON.parse(response || "{}");

    // Cookie and token should match (same secret used)
    if (data.csrfCookie.fullValue && data.fullToken) {
      expect(data.csrfCookie.fullValue).toBe(data.fullToken);
    }
  });
});
