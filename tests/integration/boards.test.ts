/**
 * Integration tests for boards API
 * Tests CRUD operations for boards
 */

import { beforeAll, beforeEach, describe, expect, it } from "bun:test";
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

describe("Boards API", () => {
  let managerCookies: string = "";
  let memberCookies: string = "";
  let teamId: string;

  beforeAll(async () => {
    await prepareTestDb();

    // Create fresh users for this test file
    const managerEmail = generateTestEmail("boards-manager");
    const memberEmail = generateTestEmail("boards-member");

    await createTestUser(
      managerEmail,
      "password123",
      "manager",
      "Manager User",
    );
    await createTestUser(memberEmail, "password123", "member", "Member User");

    const { cookieHeader: managerCookieHeader } = await loginAsUser(
      managerEmail,
      "password123",
    );
    managerCookies = managerCookieHeader;

    const { cookieHeader: memberCookieHeader } = await loginAsUser(
      memberEmail,
      "password123",
    );
    memberCookies = memberCookieHeader;

    // Create a team for boards
    const { token: csrfToken } = await getCsrfToken(managerCookies);
    let req = request(app).post("/api/teams").set("Cookie", managerCookies);
    req = setCsrfHeadersIfEnabled(req, csrfToken);
    const teamResponse = await req.send({ name: "Test Team" });

    teamId = teamResponse.body.id;
  });

  describe("GET /api/boards", () => {
    it("should return boards for a team", async () => {
      const response = await request(app)
        .get("/api/boards")
        .query({ team_id: teamId })
        .set("Cookie", memberCookies);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it("should require team_id query parameter", async () => {
      const response = await request(app)
        .get("/api/boards")
        .set("Cookie", memberCookies);

      expect(response.status).toBe(400);
    });

    it("should require authentication", async () => {
      const response = await request(app)
        .get("/api/boards")
        .query({ team_id: teamId });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/boards/:id", () => {
    let boardId: string;

    beforeEach(async () => {
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app).post("/api/boards").set("Cookie", managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const createResponse = await req.send({
        name: "Test Board",
        description: "Test Description",
        team_id: teamId,
      });

      boardId = createResponse.body.id;
    });

    it("should return board by id", async () => {
      const response = await request(app)
        .get(`/api/boards/${boardId}`)
        .set("Cookie", memberCookies);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", boardId);
      expect(response.body).toHaveProperty("name", "Test Board");
    });

    it("should return 404 for non-existent board", async () => {
      const response = await request(app)
        .get("/api/boards/00000000-0000-0000-0000-000000000000")
        .set("Cookie", memberCookies);

      expect(response.status).toBe(404);
    });

    it("should require authentication", async () => {
      const response = await request(app).get(`/api/boards/${boardId}`);

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/boards", () => {
    it("should create board as manager", async () => {
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app).post("/api/boards").set("Cookie", managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req.send({
        name: "New Board",
        description: "Board Description",
        team_id: teamId,
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("name", "New Board");
      expect(response.body).toHaveProperty("team_id", teamId);
    });

    it("should reject board creation by member", async () => {
      const { token: csrfToken } = await getCsrfToken(memberCookies);
      let req = request(app).post("/api/boards").set("Cookie", memberCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req.send({
        name: "Member Board",
        team_id: teamId,
      });

      expect(response.status).toBe(403);
    });

    it("should validate required fields", async () => {
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app).post("/api/boards").set("Cookie", managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req.send({});

      expect(response.status).toBe(400);
    });

    it("should require authentication", async () => {
      const response = await request(app)
        .post("/api/boards")
        .send({ name: "Unauthorized Board", team_id: teamId });

      expect(response.status).toBe(401);
    });
  });

  describe("PUT /api/boards/:id", () => {
    let boardId: string;

    beforeEach(async () => {
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app).post("/api/boards").set("Cookie", managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const createResponse = await req.send({
        name: "Original Board",
        team_id: teamId,
      });

      boardId = createResponse.body.id;
    });

    it("should update board as manager", async () => {
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app)
        .put(`/api/boards/${boardId}`)
        .set("Cookie", managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req.send({
        name: "Updated Board",
        description: "Updated Description",
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("name", "Updated Board");
    });

    it("should reject update by member", async () => {
      const { token: csrfToken } = await getCsrfToken(memberCookies);
      let req = request(app)
        .put(`/api/boards/${boardId}`)
        .set("Cookie", memberCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req.send({ name: "Hacked Board" });

      expect(response.status).toBe(403);
    });

    it("should require authentication", async () => {
      const response = await request(app)
        .put(`/api/boards/${boardId}`)
        .send({ name: "Unauthorized Update" });

      expect(response.status).toBe(401);
    });
  });

  describe("DELETE /api/boards/:id", () => {
    let boardId: string;

    beforeEach(async () => {
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app).post("/api/boards").set("Cookie", managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const createResponse = await req.send({
        name: "Board to Delete",
        team_id: teamId,
      });

      boardId = createResponse.body.id;
    });

    it("should delete board as manager", async () => {
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app)
        .delete(`/api/boards/${boardId}`)
        .set("Cookie", managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req;

      expect(response.status).toBe(204);
    });

    it("should reject delete by member", async () => {
      const { token: csrfToken } = await getCsrfToken(memberCookies);
      let req = request(app)
        .delete(`/api/boards/${boardId}`)
        .set("Cookie", memberCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req;

      expect(response.status).toBe(403);
    });

    it("should require authentication", async () => {
      const response = await request(app).delete(`/api/boards/${boardId}`);

      expect(response.status).toBe(401);
    });
  });
});
