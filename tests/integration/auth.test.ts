/**
 * Integration tests for authentication API
 * Tests complete auth flow: register, login, session, logout
 * Uses Supabase Auth with cookie-based sessions
 */

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../../ProjectSourceCode/src/server/app.js";
import { createTestUser, loginAsUser, resetTestDb } from "../setup/helpers.js";

describe("Auth API", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  describe("POST /api/auth/register", () => {
    it("should register a new user", async () => {
      const response = await request(app).post("/api/auth/register").send({
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

      const response = await request(app).post("/api/auth/register").send({
        email: "duplicate@example.com",
        password: "password123",
        display_name: "Duplicate User",
      });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty("error", "User already exists");
      expect(response.body).toHaveProperty("message");
    });

    it("should validate required fields", async () => {
      const response = await request(app).post("/api/auth/register").send({
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
      const response = await request(app).post("/api/auth/login").send({
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
      const response = await request(app).post("/api/auth/login").send({
        email: "nonexistent@example.com",
        password: "password123",
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error", "Invalid credentials");
      expect(response.body).toHaveProperty("message");
    });

    it("should reject invalid password", async () => {
      const response = await request(app).post("/api/auth/login").send({
        email: "login@example.com",
        password: "wrongpassword",
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error", "Invalid credentials");
      expect(response.body).toHaveProperty("message");
    });

    it("should validate required fields", async () => {
      const response = await request(app).post("/api/auth/login").send({
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
      // Login first to get cookies
      const loginResponse = await request(app).post("/api/auth/login").send({
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
      // Login first to get cookies
      const loginResponse = await request(app).post("/api/auth/login").send({
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

      const response = await request(app)
        .post("/api/auth/logout")
        .set("Cookie", cookieString);

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
      const response = await request(app).post("/api/auth/logout");

      expect(response.status).toBe(401);
    });
  });

  describe("Complete Auth Flow", () => {
    it("should complete full flow: register → login → session → logout", async () => {
      // Register
      const registerResponse = await request(app)
        .post("/api/auth/register")
        .send({
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
        const loginResponse = await request(app).post("/api/auth/login").send({
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

      // Logout
      const logoutResponse = await request(app)
        .post("/api/auth/logout")
        .set("Cookie", cookieString);

      expect(logoutResponse.status).toBe(200);
    });
  });
});
