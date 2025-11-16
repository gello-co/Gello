/**
 * Integration tests for lists API
 * Tests CRUD operations and list reordering
 */

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../../ProjectSourceCode/src/server/app.js";
import {
  createTestUser,
  getCsrfToken,
  loginAsUser,
  resetTestDb,
} from "../setup/helpers.js";

describe("Lists API", () => {
  let managerCookies: string[] = [];
  let memberCookies: string[] = [];
  let teamId: string;
  let boardId: string;

  beforeEach(async () => {
    await resetTestDb();

    await createTestUser(
      "manager@test.com",
      "password123",
      "manager",
      "Manager User",
    );
    await createTestUser(
      "member@test.com",
      "password123",
      "member",
      "Member User",
    );

    const managerSession = await loginAsUser("manager@test.com", "password123");
    managerCookies = [
      `sb-access-token=${managerSession.access_token}`,
      `sb-refresh-token=${managerSession.refresh_token}`,
    ];

    const memberSession = await loginAsUser("member@test.com", "password123");
    memberCookies = [
      `sb-access-token=${memberSession.access_token}`,
      `sb-refresh-token=${memberSession.refresh_token}`,
    ];

    // Create team and board for lists
    const csrfToken = await getCsrfToken(managerCookies);
    const teamResponse = await request(app)
      .post("/api/teams")
      .set("Cookie", managerCookies)
      .set("X-CSRF-Token", csrfToken)
      .send({ name: "Test Team" });

    teamId = teamResponse.body.id;

    const boardCsrfToken = await getCsrfToken(managerCookies);
    const boardResponse = await request(app)
      .post("/api/boards")
      .set("Cookie", managerCookies)
      .set("X-CSRF-Token", boardCsrfToken)
      .send({
        name: "Test Board",
        team_id: teamId,
      });

    boardId = boardResponse.body.id;
  });

  describe("GET /api/lists/boards/:boardId/lists", () => {
    it("should return lists for a board", async () => {
      const response = await request(app)
        .get(`/api/lists/boards/${boardId}/lists`)
        .set("Cookie", memberCookies);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it("should require authentication", async () => {
      const response = await request(app).get(
        `/api/lists/boards/${boardId}/lists`,
      );

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/lists/boards/:boardId/lists", () => {
    it("should create list as manager", async () => {
      const csrfToken = await getCsrfToken(managerCookies);
      const response = await request(app)
        .post(`/api/lists/boards/${boardId}/lists`)
        .set("Cookie", managerCookies)
        .set("X-CSRF-Token", csrfToken)
        .send({
          name: "New List",
          position: 0,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("name", "New List");
      expect(response.body).toHaveProperty("board_id", boardId);
    });

    it("should reject list creation by member", async () => {
      const csrfToken = await getCsrfToken(memberCookies);
      const response = await request(app)
        .post(`/api/lists/boards/${boardId}/lists`)
        .set("Cookie", memberCookies)
        .set("X-CSRF-Token", csrfToken)
        .send({
          name: "Member List",
        });

      expect(response.status).toBe(403);
    });

    it("should validate required fields", async () => {
      const csrfToken = await getCsrfToken(managerCookies);
      const response = await request(app)
        .post(`/api/lists/boards/${boardId}/lists`)
        .set("Cookie", managerCookies)
        .set("X-CSRF-Token", csrfToken)
        .send({});

      expect(response.status).toBe(400);
    });

    it("should require authentication", async () => {
      const response = await request(app)
        .post(`/api/lists/boards/${boardId}/lists`)
        .send({ name: "Unauthorized List" });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/lists/:id", () => {
    let listId: string;

    beforeEach(async () => {
      const csrfToken = await getCsrfToken(managerCookies);
      const createResponse = await request(app)
        .post(`/api/lists/boards/${boardId}/lists`)
        .set("Cookie", managerCookies)
        .set("X-CSRF-Token", csrfToken)
        .send({
          name: "Test List",
        });

      listId = createResponse.body.id;
    });

    it("should return list by id", async () => {
      const response = await request(app)
        .get(`/api/lists/${listId}`)
        .set("Cookie", memberCookies);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", listId);
      expect(response.body).toHaveProperty("name", "Test List");
    });

    it("should return 404 for non-existent list", async () => {
      const response = await request(app)
        .get("/api/lists/00000000-0000-0000-0000-000000000000")
        .set("Cookie", memberCookies);

      expect(response.status).toBe(404);
    });

    it("should require authentication", async () => {
      const response = await request(app).get(`/api/lists/${listId}`);

      expect(response.status).toBe(401);
    });
  });

  describe("PUT /api/lists/:id", () => {
    let listId: string;

    beforeEach(async () => {
      const csrfToken = await getCsrfToken(managerCookies);
      const createResponse = await request(app)
        .post(`/api/lists/boards/${boardId}/lists`)
        .set("Cookie", managerCookies)
        .set("X-CSRF-Token", csrfToken)
        .send({
          name: "Original List",
        });

      listId = createResponse.body.id;
    });

    it("should update list as manager", async () => {
      const csrfToken = await getCsrfToken(managerCookies);
      const response = await request(app)
        .put(`/api/lists/${listId}`)
        .set("Cookie", managerCookies)
        .set("X-CSRF-Token", csrfToken)
        .send({
          name: "Updated List",
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("name", "Updated List");
    });

    it("should reject update by member", async () => {
      const csrfToken = await getCsrfToken(memberCookies);
      const response = await request(app)
        .put(`/api/lists/${listId}`)
        .set("Cookie", memberCookies)
        .set("X-CSRF-Token", csrfToken)
        .send({ name: "Hacked List" });

      expect(response.status).toBe(403);
    });

    it("should require authentication", async () => {
      const response = await request(app)
        .put(`/api/lists/${listId}`)
        .send({ name: "Unauthorized Update" });

      expect(response.status).toBe(401);
    });
  });

  describe("PATCH /api/lists/:id/reorder", () => {
    let listId1: string;
    let listId2: string;

    beforeEach(async () => {
      const csrfToken = await getCsrfToken(managerCookies);
      const list1 = await request(app)
        .post(`/api/lists/boards/${boardId}/lists`)
        .set("Cookie", managerCookies)
        .set("X-CSRF-Token", csrfToken)
        .send({ name: "List 1", position: 0 });

      const list2CsrfToken = await getCsrfToken(managerCookies);
      const list2 = await request(app)
        .post(`/api/lists/boards/${boardId}/lists`)
        .set("Cookie", managerCookies)
        .set("X-CSRF-Token", list2CsrfToken)
        .send({ name: "List 2", position: 1 });

      listId1 = list1.body.id;
      listId2 = list2.body.id;
    });

    it("should reorder lists as manager", async () => {
      const csrfToken = await getCsrfToken(managerCookies);
      const response = await request(app)
        .patch(`/api/lists/${listId1}/reorder`)
        .set("Cookie", managerCookies)
        .set("X-CSRF-Token", csrfToken)
        .send({
          board_id: boardId,
          list_positions: [
            { id: listId2, position: 0 },
            { id: listId1, position: 1 },
          ],
        });

      expect(response.status).toBe(204);
    });

    it("should reject reorder by member", async () => {
      const csrfToken = await getCsrfToken(memberCookies);
      const response = await request(app)
        .patch(`/api/lists/${listId1}/reorder`)
        .set("Cookie", memberCookies)
        .set("X-CSRF-Token", csrfToken)
        .send({
          board_id: boardId,
          list_positions: [{ id: listId1, position: 0 }],
        });

      expect(response.status).toBe(403);
    });

    it("should require authentication", async () => {
      const response = await request(app)
        .patch(`/api/lists/${listId1}/reorder`)
        .send({
          board_id: boardId,
          list_positions: [{ id: listId1, position: 0 }],
        });

      expect(response.status).toBe(401);
    });
  });

  describe("DELETE /api/lists/:id", () => {
    let listId: string;

    beforeEach(async () => {
      const csrfToken = await getCsrfToken(managerCookies);
      const createResponse = await request(app)
        .post(`/api/lists/boards/${boardId}/lists`)
        .set("Cookie", managerCookies)
        .set("X-CSRF-Token", csrfToken)
        .send({
          name: "List to Delete",
        });

      listId = createResponse.body.id;
    });

    it("should delete list as manager", async () => {
      const csrfToken = await getCsrfToken(managerCookies);
      const response = await request(app)
        .delete(`/api/lists/${listId}`)
        .set("Cookie", managerCookies)
        .set("X-CSRF-Token", csrfToken);

      expect(response.status).toBe(204);
    });

    it("should reject delete by member", async () => {
      const csrfToken = await getCsrfToken(memberCookies);
      const response = await request(app)
        .delete(`/api/lists/${listId}`)
        .set("Cookie", memberCookies)
        .set("X-CSRF-Token", csrfToken);

      expect(response.status).toBe(403);
    });

    it("should require authentication", async () => {
      const response = await request(app).delete(`/api/lists/${listId}`);

      expect(response.status).toBe(401);
    });
  });
});
