/**
 * Integration tests for authentication API
 */

import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../../../ProjectSourceCode/src/express/app.js";
import {
  createTestUser,
  generateTestEmail,
  getCsrfToken,
  prepareTestDb,
  setCsrfHeadersIfEnabled,
} from "../../setup/helpers/index.js";

async function getCsrfTokenSafe(): Promise<{ token: string; cookie: string }> {
  const csrfResponse = await request(app).get("/api/csrf-token");
  if (csrfResponse.status === 404) {
    return { token: "", cookie: "" };
  }
  return {
    token: csrfResponse.body.csrfToken || "",
    cookie: csrfResponse.headers["set-cookie"]?.[0]?.split(";")[0] || "",
  };
}

describe("Auth API", () => {
  beforeAll(async () => {
    await prepareTestDb();
  });

  describe("POST /api/auth/register", () => {
    it("should register a new user", async () => {
      const { token: csrfToken, cookie: csrfCookie } = await getCsrfTokenSafe();

      let req = request(app).post("/api/auth/register");
      req = setCsrfHeadersIfEnabled(req, csrfToken, csrfCookie);

      const testEmail = generateTestEmail("register");
      const response = await req.send({
        email: testEmail,
        password: "password123",
        passwordConfirm: "password123",
        display_name: "Test User",
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("user");
      expect(response.body.user).toHaveProperty("id");
      expect(response.body.user.email).toBe(testEmail);
      // Note: auth-api.ts only returns id and email, not display_name
      expect(response.body.user).not.toHaveProperty("password_hash");
      expect(response.headers["set-cookie"]).toBeDefined();
      const cookies = response.headers["set-cookie"];
      expect(Array.isArray(cookies)).toBe(true);
      // Supabase SSR uses various cookie names for auth tokens
      // Just verify cookies are set
    });

    it("should reject duplicate email", async () => {
      const duplicateEmail = generateTestEmail("duplicate");
      await createTestUser(duplicateEmail, "password123");

      const { token: csrfToken, cookie: csrfCookie } = await getCsrfTokenSafe();

      let req = request(app).post("/api/auth/register");
      req = setCsrfHeadersIfEnabled(req, csrfToken, csrfCookie);

      const response = await req.send({
        email: duplicateEmail,
        password: "password123",
        passwordConfirm: "password123",
        display_name: "Duplicate User",
      });

      // Supabase returns 400 with its own error message for duplicates
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should validate required fields", async () => {
      const { token: csrfToken, cookie: csrfCookie } = await getCsrfTokenSafe();

      let req = request(app).post("/api/auth/register");
      req = setCsrfHeadersIfEnabled(req, csrfToken, csrfCookie);

      const response = await req.send({
        email: "invalid-email",
        password: "short",
        passwordConfirm: "short",
        display_name: "",
      });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/auth/login", () => {
    let loginEmail: string;

    beforeEach(async () => {
      loginEmail = generateTestEmail("login");
      await createTestUser(loginEmail, "password123", "member", "Login User");
    });

    it("should login with valid credentials and set session cookies", async () => {
      const { token: csrfToken, cookie: csrfCookie } = await getCsrfTokenSafe();

      let req = request(app).post("/api/auth/login");
      req = setCsrfHeadersIfEnabled(req, csrfToken, csrfCookie);

      const response = await req.send({
        email: loginEmail,
        password: "password123",
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("user");
      expect(response.body.user.email).toBe(loginEmail);
      expect(response.headers["set-cookie"]).toBeDefined();
      const cookies = response.headers["set-cookie"];
      expect(Array.isArray(cookies)).toBe(true);
      // Supabase SSR uses various cookie names for auth tokens
      // Just verify cookies are set (don't check specific cookie names)
    });

    it("should reject invalid email", async () => {
      const { token: csrfToken, cookie: csrfCookie } = await getCsrfTokenSafe();

      let req = request(app).post("/api/auth/login");
      req = setCsrfHeadersIfEnabled(req, csrfToken, csrfCookie);

      const response = await req.send({
        email: "nonexistent@example.com",
        password: "password123",
      });

      expect(response.status).toBe(401);
      // Supabase returns "Invalid login credentials" as the error message
      expect(response.body).toHaveProperty("error");
    });

    it("should reject invalid password", async () => {
      const { token: csrfToken, cookie: csrfCookie } = await getCsrfTokenSafe();

      let req = request(app).post("/api/auth/login");
      req = setCsrfHeadersIfEnabled(req, csrfToken, csrfCookie);

      const response = await req.send({
        email: loginEmail,
        password: "wrongpassword",
      });

      expect(response.status).toBe(401);
      // Supabase returns "Invalid login credentials" as the error message
      expect(response.body).toHaveProperty("error");
    });

    it("should validate required fields", async () => {
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
    let sessionEmail: string;

    beforeEach(async () => {
      sessionEmail = generateTestEmail("session");
      await createTestUser(
        sessionEmail,
        "password123",
        "member",
        "Session User",
      );
    });

    it("should return user session with valid session cookies", async () => {
      const { token: csrfToken, cookie: csrfCookie } = await getCsrfTokenSafe();

      let loginReq = request(app).post("/api/auth/login");
      loginReq = setCsrfHeadersIfEnabled(loginReq, csrfToken, csrfCookie);

      const loginResponse = await loginReq.send({
        email: sessionEmail,
        password: "password123",
      });

      expect(loginResponse.status).toBe(200);
      const setCookies = loginResponse.headers["set-cookie"];
      if (!setCookies || !Array.isArray(setCookies)) {
        throw new Error("No cookies returned from login");
      }

      // Extract cookie values and join as single Cookie header string
      // Supertest can accept either array or string, but string format is more reliable
      const cookieStrings = setCookies
        .map((cookie: string) => cookie.split(";")[0])
        .filter((c): c is string => typeof c === "string" && c.length > 0);

      // Join cookies with "; " (semicolon + space) as per HTTP Cookie header spec
      const cookieHeader = cookieStrings.join("; ");

      const response = await request(app)
        .get("/api/auth/session")
        .set("Cookie", cookieHeader);

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
    let logoutEmail: string;

    beforeEach(async () => {
      logoutEmail = generateTestEmail("logout");
      await createTestUser(logoutEmail, "password123", "member", "Logout User");
    });

    it("should accept logout request with valid session cookies", async () => {
      const { token: csrfToken, cookie: csrfCookie } = await getCsrfTokenSafe();

      let loginReq = request(app).post("/api/auth/login");
      loginReq = setCsrfHeadersIfEnabled(loginReq, csrfToken, csrfCookie);

      const loginResponse = await loginReq.send({
        email: logoutEmail,
        password: "password123",
      });

      const setCookies = loginResponse.headers["set-cookie"];
      if (!setCookies || !Array.isArray(setCookies)) {
        throw new Error("No cookies returned from login");
      }

      const cookieStrings = setCookies
        .map((cookie: string) => cookie.split(";")[0])
        .filter((c): c is string => typeof c === "string" && c.length > 0);

      const cookieHeader = cookieStrings.join("; ");
      const { token: logoutCsrfToken } = await getCsrfToken(cookieStrings);

      let logoutReq = request(app)
        .post("/api/auth/logout")
        .set("Cookie", cookieHeader);
      logoutReq = setCsrfHeadersIfEnabled(logoutReq, logoutCsrfToken);

      const response = await logoutReq;

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message");
      // Note: Cookie clearing behavior depends on Supabase SSR implementation
      // Just verify the logout succeeded
    });

    it("should reject logout without session cookies", async () => {
      const { token: csrfToken, cookie: csrfCookie } = await getCsrfTokenSafe();

      let req = request(app).post("/api/auth/logout");
      req = setCsrfHeadersIfEnabled(req, csrfToken, csrfCookie);

      const response = await req;

      expect(response.status).toBe(401);
    });
  });

  describe("Complete Auth Flow", () => {
    it("should complete full flow: register → login → session → logout", async () => {
      const flowEmail = generateTestEmail("flow");
      const { token: csrfToken, cookie: csrfCookie } = await getCsrfTokenSafe();

      let registerReq = request(app).post("/api/auth/register");
      registerReq = setCsrfHeadersIfEnabled(registerReq, csrfToken, csrfCookie);

      const registerResponse = await registerReq.send({
        email: flowEmail,
        password: "password123",
        passwordConfirm: "password123",
        display_name: "Flow User",
      });

      expect(registerResponse.status).toBe(201);
      const userId = registerResponse.body.user.id;
      const registerCookies = registerResponse.headers["set-cookie"];

      let cookieStrings: string[] = [];
      if (
        registerCookies &&
        Array.isArray(registerCookies) &&
        registerCookies.length > 0
      ) {
        cookieStrings = registerCookies
          .map((cookie: string) => cookie.split(";")[0])
          .filter((c): c is string => typeof c === "string" && c.length > 0);
      } else {
        let loginReq = request(app).post("/api/auth/login");
        loginReq = setCsrfHeadersIfEnabled(loginReq, csrfToken, csrfCookie);

        const loginResponse = await loginReq.send({
          email: flowEmail,
          password: "password123",
        });

        expect(loginResponse.status).toBe(200);
        const loginCookies = loginResponse.headers["set-cookie"];
        if (loginCookies && Array.isArray(loginCookies)) {
          cookieStrings = loginCookies
            .map((cookie: string) => cookie.split(";")[0])
            .filter((c): c is string => typeof c === "string" && c.length > 0);
        }
      }

      const cookieHeader = cookieStrings.join("; ");
      const sessionResponse = await request(app)
        .get("/api/auth/session")
        .set("Cookie", cookieHeader);

      expect(sessionResponse.status).toBe(200);
      expect(sessionResponse.body.user.id).toBe(userId);

      const { token: logoutCsrfToken } = await getCsrfToken(cookieStrings);

      let logoutReq = request(app)
        .post("/api/auth/logout")
        .set("Cookie", cookieHeader);
      logoutReq = setCsrfHeadersIfEnabled(logoutReq, logoutCsrfToken);

      const logoutResponse = await logoutReq;

      expect(logoutResponse.status).toBe(200);
    });
  });
});
