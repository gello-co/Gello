/**
 * Integration tests for authentication API using Bun test runner.
 */

import { beforeAll, beforeEach, describe, expect, it } from "bun:test";
import request from "supertest";
import { app } from "../../ProjectSourceCode/src/server/app.js";
import {
  createTestUser,
  generateTestEmail,
  getCsrfToken,
  prepareTestDb,
  setCsrfHeadersIfEnabled,
} from "../setup/helpers/index.js";

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

// Positive Testcase:
// API: POST /auth/register
// Input: {email: testEmail, password: "password123", passwordConfirm: "password123", display_name: "Test User"}
// Expect: res.status == 201 and res.body.user.email == testEmail and res.body.user.display_name == "Test User"
// Result: This test case should successfully register a new user and return a status 201 along with correct user details
// Explanation: The testcase will call the /auth/register API with valid user details and expects the API to return a status of 201 
// along with the user details excluding sensitive information like password hash.

describe("Auth API (bun)", () => {
  beforeAll(async () => {
    await prepareTestDb();
  });

  describe("POST /auth/register", () => {
    it("should register a new user", async () => {
      const { token: csrfToken, cookie: csrfCookie } = await getCsrfTokenSafe();

      let req = request(app).post("/auth/register");
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
      expect(response.body.user.display_name).toBe("Test User");
      expect(response.body.user).not.toHaveProperty("password_hash");
      expect(response.headers["set-cookie"]).toBeDefined();
      const cookies = response.headers["set-cookie"];
      expect(Array.isArray(cookies)).toBe(true);
      if (Array.isArray(cookies)) {
        expect(cookies.some((c: string) => c.includes("sb-access-token"))).toBe(
          true,
        );
      }
    });

// Negative Testcase:
// API: POST /auth/register
// Input: {email: duplicateEmail, password: "password123", passwordConfirm: "password123", display_name: "Duplicate User"}
// Expect: res.status == 409 and res.body.error == "User already exists"
// Result: This test case should fail registration and return a status 409 along with an error message saying that the user already exists.
// Explanation: The testcase creates a user with a duplicate email, and then tries to register again with the same email.
// The API should detect the duplicate email and return a 409 status with an error message.

    it("should reject duplicate email", async () => {
      const duplicateEmail = generateTestEmail("duplicate");
      await createTestUser(duplicateEmail, "password123");

      const { token: csrfToken, cookie: csrfCookie } = await getCsrfTokenSafe();

      let req = request(app).post("/auth/register");
      req = setCsrfHeadersIfEnabled(req, csrfToken, csrfCookie);

      const response = await req.send({
        email: duplicateEmail,
        password: "password123",
        passwordConfirm: "password123",
        display_name: "Duplicate User",
      });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty("error", "User already exists");
      expect(response.body).toHaveProperty("message");
    });

    it("should validate required fields", async () => {
      const { token: csrfToken, cookie: csrfCookie } = await getCsrfTokenSafe();

      let req = request(app).post("/auth/register");
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
});
