/**
 * Integration tests for view rendering
 * Tests that page routes return correct Handlebars templates with proper data
 */

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../../ProjectSourceCode/src/server/app.js";
import {
  createTestUser,
  getCsrfToken,
  loginAsAdmin,
  loginAsUser,
  resetTestDb,
} from "../setup/helpers.js";

describe("View Rendering", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  describe("GET /", () => {
    it("should render home page", async () => {
      const response = await request(app).get("/");

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
      expect(response.text).toContain("Gello");
    });
  });

  describe("GET /login", () => {
    it("should render login page", async () => {
      const response = await request(app).get("/login");

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
      expect(response.text).toContain("Login");
    });
  });

  describe("GET /register", () => {
    it("should render register page", async () => {
      const response = await request(app).get("/register");

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
      expect(response.text).toContain("Register");
    });
  });

  describe("GET /teams", () => {
    it("should require authentication", async () => {
      const response = await request(app).get("/teams");

      expect(response.status).toBe(401);
    });

    it("should render teams list for authenticated user", async () => {
      const userEmail = `teams-view-${Date.now()}@test.com`;
      await createTestUser(userEmail, "password123", "member", "Test User");
      const session = await loginAsUser(userEmail, "password123");

      const response = await request(app)
        .get("/teams")
        .set("Cookie", [
          `sb-access-token=${session.access_token}`,
          `sb-refresh-token=${session.refresh_token}`,
        ]);

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
      expect(response.text).toContain("Teams");
    });
  });

  describe("GET /teams/:id", () => {
    it("should require authentication", async () => {
      const response = await request(app).get("/teams/123");

      expect(response.status).toBe(401);
    });

    it("should render team detail page for authenticated user", async () => {
      const userEmail = `team-detail-${Date.now()}@test.com`;
      await createTestUser(userEmail, "password123", "member", "Test User");
      const session = await loginAsUser(userEmail, "password123");

      // Create a team first
      const adminSession = await loginAsAdmin();
      const adminCookies = [
        `sb-access-token=${adminSession.access_token}`,
        `sb-refresh-token=${adminSession.refresh_token}`,
      ];
      const csrfToken = await getCsrfToken(adminCookies);
      const teamResponse = await request(app)
        .post("/api/teams")
        .set("Cookie", adminCookies)
        .set("X-CSRF-Token", csrfToken)
        .send({ name: "Test Team" });

      const teamId = teamResponse.body.id;

      const response = await request(app)
        .get(`/teams/${teamId}`)
        .set("Cookie", [
          `sb-access-token=${session.access_token}`,
          `sb-refresh-token=${session.refresh_token}`,
        ]);

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
      expect(response.text).toContain("Test Team");
    });
  });

  describe("GET /boards", () => {
    it("should require authentication", async () => {
      const response = await request(app).get("/boards");

      expect(response.status).toBe(401);
    });

    it("should render boards list for authenticated user", async () => {
      const userEmail = `boards-view-${Date.now()}@test.com`;
      await createTestUser(userEmail, "password123", "member", "Test User");
      const session = await loginAsUser(userEmail, "password123");

      const response = await request(app)
        .get("/boards")
        .set("Cookie", [
          `sb-access-token=${session.access_token}`,
          `sb-refresh-token=${session.refresh_token}`,
        ]);

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
      expect(response.text).toContain("Boards");
    });
  });

  describe("GET /boards/:id", () => {
    it("should require authentication", async () => {
      const response = await request(app).get("/boards/123");

      expect(response.status).toBe(401);
    });

    it("should render board detail page for authenticated user", async () => {
      const userEmail = `board-detail-${Date.now()}@test.com`;
      await createTestUser(userEmail, "password123", "member", "Test User");
      const session = await loginAsUser(userEmail, "password123");

      // Create a team and board first
      const adminSession = await loginAsAdmin();
      const adminCookies = [
        `sb-access-token=${adminSession.access_token}`,
        `sb-refresh-token=${adminSession.refresh_token}`,
      ];
      const csrfToken = await getCsrfToken(adminCookies);
      const teamResponse = await request(app)
        .post("/api/teams")
        .set("Cookie", adminCookies)
        .set("X-CSRF-Token", csrfToken)
        .send({ name: "Test Team" });

      const teamId = teamResponse.body.id;

      const boardCsrfToken = await getCsrfToken(adminCookies);
      const boardResponse = await request(app)
        .post("/api/boards")
        .set("Cookie", adminCookies)
        .set("X-CSRF-Token", boardCsrfToken)
        .send({
          name: "Test Board",
          description: "Test Description",
          team_id: teamId,
        });

      const boardId = boardResponse.body.id;

      const response = await request(app)
        .get(`/boards/${boardId}`)
        .set("Cookie", [
          `sb-access-token=${session.access_token}`,
          `sb-refresh-token=${session.refresh_token}`,
        ]);

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
      expect(response.text).toContain("Test Board");
    });
  });

  describe("GET /leaderboard", () => {
    it("should require authentication", async () => {
      const response = await request(app).get("/leaderboard");

      expect(response.status).toBe(401);
    });

    it("should render leaderboard for authenticated user", async () => {
      const userEmail = `leaderboard-${Date.now()}@test.com`;
      await createTestUser(userEmail, "password123", "member", "Test User");
      const session = await loginAsUser(userEmail, "password123");

      const response = await request(app)
        .get("/leaderboard")
        .set("Cookie", [
          `sb-access-token=${session.access_token}`,
          `sb-refresh-token=${session.refresh_token}`,
        ]);

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
      expect(response.text).toContain("Leaderboard");
    });
  });

  describe("GET /profile", () => {
    it("should require authentication", async () => {
      const response = await request(app).get("/profile");

      expect(response.status).toBe(401);
    });

    it("should render profile page for authenticated user", async () => {
      const userEmail = `profile-${Date.now()}@test.com`;
      await createTestUser(userEmail, "password123", "member", "Test User");
      const session = await loginAsUser(userEmail, "password123");

      const response = await request(app)
        .get("/profile")
        .set("Cookie", [
          `sb-access-token=${session.access_token}`,
          `sb-refresh-token=${session.refresh_token}`,
        ]);

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
      expect(response.text).toContain("Profile");
    });
  });
});
