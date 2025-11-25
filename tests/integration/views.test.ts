/**
 * Integration tests for view rendering
 * Tests that page routes return correct Handlebars templates with proper data
 */

import { beforeAll, describe, expect, it } from "bun:test";
import request from "supertest";
import { app } from "../../ProjectSourceCode/src/server/app.js";
import {
  createTestUser,
  generateTestEmail,
  getCsrfToken,
  loginAsUser,
  prepareTestDb,
  setCsrfHeadersIfEnabled,
} from "../setup/helpers/index.js";

describe("View Rendering", () => {
  beforeAll(async () => {
    await prepareTestDb();
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
      const userEmail = generateTestEmail("teams-view");
      await createTestUser(userEmail, "password123", "member", "Test User");
      const { cookieHeader } = await loginAsUser(userEmail, "password123");

      const response = await request(app)
        .get("/teams")
        .set("Cookie", cookieHeader);

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
      const userEmail = generateTestEmail("team-detail");
      await createTestUser(userEmail, "password123", "member", "Test User");
      const { cookieHeader } = await loginAsUser(userEmail, "password123");

      // Create a team first (use manager instead of admin)
      const managerEmail = generateTestEmail("team-detail-manager");
      await createTestUser(
        managerEmail,
        "password123",
        "manager",
        "Manager User",
      );
      const { cookieHeader: managerCookieHeader } = await loginAsUser(
        managerEmail,
        "password123",
      );
      const { token: csrfToken } = await getCsrfToken(managerCookieHeader);
      let req = request(app)
        .post("/api/teams")
        .set("Cookie", managerCookieHeader);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const teamResponse = await req.send({ name: "Test Team" });

      const teamId = teamResponse.body.id;

      const response = await request(app)
        .get(`/teams/${teamId}`)
        .set("Cookie", cookieHeader);

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
      const userEmail = generateTestEmail("boards-view");
      await createTestUser(userEmail, "password123", "member", "Test User");
      const { cookieHeader } = await loginAsUser(userEmail, "password123");

      const response = await request(app)
        .get("/boards")
        .set("Cookie", cookieHeader);

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
      const userEmail = generateTestEmail("board-detail");
      await createTestUser(userEmail, "password123", "member", "Test User");
      const { cookieHeader } = await loginAsUser(userEmail, "password123");

      // Create a team and board first (use manager instead of admin)
      const managerEmail = generateTestEmail("board-detail-manager");
      await createTestUser(
        managerEmail,
        "password123",
        "manager",
        "Manager User",
      );
      const { cookieHeader: managerCookieHeader } = await loginAsUser(
        managerEmail,
        "password123",
      );
      const { token: csrfToken } = await getCsrfToken(managerCookieHeader);
      let req = request(app)
        .post("/api/teams")
        .set("Cookie", managerCookieHeader);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const teamResponse = await req.send({ name: "Test Team" });

      const teamId = teamResponse.body.id;

      const { token: boardCsrfToken } = await getCsrfToken(managerCookieHeader);
      let boardReq = request(app)
        .post("/api/boards")
        .set("Cookie", managerCookieHeader);
      boardReq = setCsrfHeadersIfEnabled(boardReq, boardCsrfToken);
      const boardResponse = await boardReq.send({
        name: "Test Board",
        description: "Test Description",
        team_id: teamId,
      });

      const boardId = boardResponse.body.id;

      const response = await request(app)
        .get(`/boards/${boardId}`)
        .set("Cookie", cookieHeader);

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
      const userEmail = generateTestEmail("leaderboard");
      await createTestUser(userEmail, "password123", "member", "Test User");
      const { cookieHeader } = await loginAsUser(userEmail, "password123");

      const response = await request(app)
        .get("/leaderboard")
        .set("Cookie", cookieHeader);

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
      const userEmail = generateTestEmail("profile");
      await createTestUser(userEmail, "password123", "member", "Test User");
      const { cookieHeader } = await loginAsUser(userEmail, "password123");

      const response = await request(app)
        .get("/profile")
        .set("Cookie", cookieHeader);

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
      expect(response.text).toContain("Profile");
    });
  });
});
