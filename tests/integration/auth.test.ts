/**
 * Integration tests for authentication API
 * Tests complete auth flow: register, login, session, logout
 * Uses Supabase Auth with cookie-based sessions
 */

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../../ProjectSourceCode/src/server/app.js";
import {
  createTestUser,
  getCsrfToken,
  loginAsUser,
  resetTestDb,
  setCsrfHeadersIfEnabled,
} from "../setup/supabase-test-helpers.js";

/**
 * Helper to get CSRF token safely (handles disabled CSRF)
 * Returns empty string when CSRF endpoint doesn't exist (404)
 */
async function getCsrfTokenSafe(): Promise<{ token: string; cookie: string }> {
  const csrfResponse = await request(app).get("/api/csrf-token");
  if (csrfResponse.status === 404) {
    // CSRF protection is disabled (deferred to v0.2.0)
    return { token: "", cookie: "" };
  }
  return {
    token: csrfResponse.body.csrfToken || "",
    cookie: csrfResponse.headers["set-cookie"]?.[0]?.split(";")[0] || "",
  };
}

describe("Auth API", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  describe("POST /api/auth/register", () => {
    it("should register a new user", async () => {
      // Get CSRF token and cookie (handles disabled CSRF gracefully)
      const { token: csrfToken, cookie: csrfCookie } = await getCsrfTokenSafe();

      let req = request(app).post("/api/auth/register");
      req = setCsrfHeadersIfEnabled(req, csrfToken, csrfCookie);

      const response = await req.send({
        email: "test@example.com",
        password: "password123",
        display_name: "Test User",
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("user");
      expect(response.body.user).toHaveProperty("id");
      expect(response.body.user.email).toBe("test@example.com");
      expect(response.body.user.display_name).toBe("Test User");
      expect(response.body.user).not.toHaveProperty("password_hash");
      // Check for session cookies
      expect(response.headers["set-cookie"]).toBeDefined();
      const cookies = response.headers["set-cookie"];
      expect(Array.isArray(cookies)).toBe(true);
      if (Array.isArray(cookies)) {
        expect(cookies.some((c: string) => c.includes("sb-access-token"))).toBe(
          true,
        );
      }
    });

    it("should reject duplicate email", async () => {
      await createTestUser("duplicate@example.com", "password123");

      // Get CSRF token and cookie
      const { token: csrfToken, cookie: csrfCookie } = await getCsrfTokenSafe();

      let req = request(app).post("/api/auth/register");
      req = setCsrfHeadersIfEnabled(req, csrfToken, csrfCookie);

      const response = await req.send({
        email: "duplicate@example.com",
        password: "password123",
        display_name: "Duplicate User",
      });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty("error", "User already exists");
      expect(response.body).toHaveProperty("message");
    });

    it("should validate required fields", async () => {
      // Get CSRF token and cookie
      const { token: csrfToken, cookie: csrfCookie } = await getCsrfTokenSafe();

      let req = request(app).post("/api/auth/register");
      req = setCsrfHeadersIfEnabled(req, csrfToken, csrfCookie);

      const response = await req.send({
        email: "invalid-email",
        password: "short",
        display_name: "",
      });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      await createTestUser(
        "login@example.com",
        "password123",
        "member",
        "Login User",
      );
    });

    it("should login with valid credentials and set session cookies", async () => {
      // Get CSRF token and cookie
      const { token: csrfToken, cookie: csrfCookie } = await getCsrfTokenSafe();

      let req = request(app).post("/api/auth/login");
      req = setCsrfHeadersIfEnabled(req, csrfToken, csrfCookie);

      const response = await req.send({
        email: "login@example.com",
        password: "password123",
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("user");
      expect(response.body.user.email).toBe("login@example.com");
      // Check for session cookies
      expect(response.headers["set-cookie"]).toBeDefined();
      const cookies = response.headers["set-cookie"];
      expect(Array.isArray(cookies)).toBe(true);
      if (Array.isArray(cookies)) {
        expect(cookies.some((c: string) => c.includes("sb-access-token"))).toBe(
          true,
        );
      }
    });

    it("should reject invalid email", async () => {
      // Get CSRF token and cookie
      const { token: csrfToken, cookie: csrfCookie } = await getCsrfTokenSafe();

      let req = request(app).post("/api/auth/login");
      req = setCsrfHeadersIfEnabled(req, csrfToken, csrfCookie);

      const response = await req.send({
        email: "nonexistent@example.com",
        password: "password123",
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error", "Invalid credentials");
      expect(response.body).toHaveProperty("message");
    });

    it("should reject invalid password", async () => {
      // Get CSRF token and cookie
      const { token: csrfToken, cookie: csrfCookie } = await getCsrfTokenSafe();

      let req = request(app).post("/api/auth/login");
      req = setCsrfHeadersIfEnabled(req, csrfToken, csrfCookie);

      const response = await req.send({
        email: "login@example.com",
        password: "wrongpassword",
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error", "Invalid credentials");
      expect(response.body).toHaveProperty("message");
    });

    it("should validate required fields", async () => {
      // Get CSRF token and cookie
      const { token: csrfToken, cookie: csrfCookie } = await getCsrfTokenSafe();

      let req = request(app).post("/api/auth/login");
      req = setCsrfHeadersIfEnabled(req, csrfToken, csrfCookie);

      const response = await req.send({
        email: "",
        password: "",
      });

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/auth/session", () => {
    beforeEach(async () => {
      await createTestUser(
        "session@example.com",
        "password123",
        "member",
        "Session User",
      );
    });

    it("should return user session with valid session cookies", async () => {
      // Get CSRF token and cookie for login
      const { token: csrfToken, cookie: csrfCookie } = await getCsrfTokenSafe();

      // Login first to get cookies
      let loginReq = request(app).post("/api/auth/login");
      loginReq = setCsrfHeadersIfEnabled(loginReq, csrfToken, csrfCookie);

      const loginResponse = await loginReq.send({
        email: "session@example.com",
        password: "password123",
      });

      expect(loginResponse.status).toBe(200);
      const setCookies = loginResponse.headers["set-cookie"];
      if (!setCookies || !Array.isArray(setCookies)) {
        throw new Error("No cookies returned from login");
      }

      // Extract cookie name=value pairs from Set-Cookie headers
      // Format: "name=value; Path=/; HttpOnly" -> "name=value"
      const cookieString = setCookies
        .map((cookie: string) => cookie.split(";")[0])
        .join("; ");

      // Use cookies for session request
      const response = await request(app)
        .get("/api/auth/session")
        .set("Cookie", cookieString);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("user");
      expect(response.body.user).toHaveProperty("id");
      expect(response.body.user).toHaveProperty("email");
      expect(response.body.user).toHaveProperty("role");
    });

    it("should reject request without session cookies", async () => {
      const response = await request(app).get("/api/auth/session");

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/auth/logout", () => {
    beforeEach(async () => {
      await createTestUser(
        "logout@example.com",
        "password123",
        "member",
        "Logout User",
      );
    });

    it("should accept logout request with valid session cookies", async () => {
      // Get CSRF token and cookie for login
      const { token: csrfToken, cookie: csrfCookie } = await getCsrfTokenSafe();

      // Login first to get cookies
      let loginReq = request(app).post("/api/auth/login");
      loginReq = setCsrfHeadersIfEnabled(loginReq, csrfToken, csrfCookie);

      const loginResponse = await loginReq.send({
        email: "logout@example.com",
        password: "password123",
      });

      const setCookies = loginResponse.headers["set-cookie"];
      if (!setCookies || !Array.isArray(setCookies)) {
        throw new Error("No cookies returned from login");
      }

      // Extract cookie name=value pairs from Set-Cookie headers
      const cookieString = setCookies
        .map((cookie: string) => cookie.split(";")[0])
        .join("; ");

      // Get CSRF token for authenticated request
      const { token: logoutCsrfToken } = await getCsrfToken(
        cookieString.split("; ").filter((c) => c),
      );

      let logoutReq = request(app)
        .post("/api/auth/logout")
        .set("Cookie", cookieString);
      logoutReq = setCsrfHeadersIfEnabled(logoutReq, logoutCsrfToken);

      const response = await logoutReq;

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message");
      // Check that cookies are cleared
      const clearedCookies = response.headers["set-cookie"];
      if (clearedCookies && Array.isArray(clearedCookies)) {
        expect(
          clearedCookies.some((c: string) => c.includes("sb-access-token=;")),
        ).toBe(true);
      }
    });

    it("should reject logout without session cookies", async () => {
      // Get CSRF token and cookie
      const { token: csrfToken, cookie: csrfCookie } = await getCsrfTokenSafe();

      let req = request(app).post("/api/auth/logout");
      req = setCsrfHeadersIfEnabled(req, csrfToken, csrfCookie);

      const response = await req;

      expect(response.status).toBe(401);
    });
  });

  describe("Complete Auth Flow", () => {
    it("should complete full flow: register → login → session → logout", async () => {
      // Get CSRF token and cookie
      const { token: csrfToken, cookie: csrfCookie } = await getCsrfTokenSafe();

      // Register
      let registerReq = request(app).post("/api/auth/register");
      registerReq = setCsrfHeadersIfEnabled(registerReq, csrfToken, csrfCookie);

      const registerResponse = await registerReq.send({
        email: "flow@example.com",
        password: "password123",
        display_name: "Flow User",
      });

      expect(registerResponse.status).toBe(201);
      const userId = registerResponse.body.user.id;
      const registerCookies = registerResponse.headers["set-cookie"];

      // Login (if register didn't create session)
      let cookieString = "";
      if (
        registerCookies &&
        Array.isArray(registerCookies) &&
        registerCookies.length > 0
      ) {
        cookieString = registerCookies
          .map((cookie: string) => cookie.split(";")[0])
          .join("; ");
      } else {
        let loginReq = request(app).post("/api/auth/login");
        loginReq = setCsrfHeadersIfEnabled(loginReq, csrfToken, csrfCookie);

        const loginResponse = await loginReq.send({
          email: "flow@example.com",
          password: "password123",
        });

        expect(loginResponse.status).toBe(200);
        const loginCookies = loginResponse.headers["set-cookie"];
        if (loginCookies && Array.isArray(loginCookies)) {
          cookieString = loginCookies
            .map((cookie: string) => cookie.split(";")[0])
            .join("; ");
        }
      }

      // Get Session
      const sessionResponse = await request(app)
        .get("/api/auth/session")
        .set("Cookie", cookieString);

      expect(sessionResponse.status).toBe(200);
      expect(sessionResponse.body.user.id).toBe(userId);

      // Get CSRF token for authenticated request
      const { token: logoutCsrfToken } = await getCsrfToken(
        cookieString.split("; ").filter((c) => c),
      );

      // Logout
      let logoutReq = request(app)
        .post("/api/auth/logout")
        .set("Cookie", cookieString);
      logoutReq = setCsrfHeadersIfEnabled(logoutReq, logoutCsrfToken);

      const logoutResponse = await logoutReq;

      expect(logoutResponse.status).toBe(200);
    });
  });
});
