/**
 * Integration tests for tasks API
 * Tests CRUD operations, task assignment, completion, and movement
 */

import { beforeAll, beforeEach, describe, expect, it } from "bun:test";
import request from "supertest";
import { app } from "../../ProjectSourceCode/src/server/app.js";
import {
  createTestUser,
  getCsrfToken,
  loginAsUser,
  prepareTestDb,
  setCsrfHeadersIfEnabled,
} from "../setup/helpers/index.js";

describe("Tasks API", () => {
  let managerCookies: string[] = [];
  let memberCookies: string[] = [];
  let teamId: string;
  let boardId: string;
  let listId: string;
  let userId: string;

  beforeAll(async () => {
    await prepareTestDb();

    const manager = await createTestUser(
      "manager@test.com",
      "password123",
      "manager",
      "Manager User",
    );
    const member = await createTestUser(
      "member@test.com",
      "password123",
      "member",
      "Member User",
    );

    userId = member.user.id;

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

    // Create team, board, and list for tasks
    const { token: csrfToken } = await getCsrfToken(managerCookies);
    let req = request(app).post("/api/teams").set("Cookie", managerCookies);
    req = setCsrfHeadersIfEnabled(req, csrfToken);
    const teamResponse = await req.send({ name: "Test Team" });

    teamId = teamResponse.body.id;

    const { token: boardCsrfToken } = await getCsrfToken(managerCookies);
    const boardResponse = await request(app)
      .post("/api/boards")
      .set("Cookie", managerCookies)
      .set("X-CSRF-Token", boardCsrfToken)
      .send({
        name: "Test Board",
        team_id: teamId,
      });

    boardId = boardResponse.body.id;

    const { token: listCsrfToken } = await getCsrfToken(managerCookies);
    const listResponse = await request(app)
      .post(`/api/lists/boards/${boardId}/lists`)
      .set("Cookie", managerCookies)
      .set("X-CSRF-Token", listCsrfToken)
      .send({
        name: "Test List",
      });

    listId = listResponse.body.id;
  }, 15000); // 15 seconds should be plenty for local Supabase

  describe("GET /api/tasks/lists/:listId/tasks", () => {
    it("should return tasks for a list", async () => {
      const response = await request(app)
        .get(`/api/tasks/lists/${listId}/tasks`)
        .set("Cookie", memberCookies);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it("should require authentication", async () => {
      const response = await request(app).get(
        `/api/tasks/lists/${listId}/tasks`,
      );

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/tasks/lists/:listId/tasks", () => {
    it("should create task as manager", async () => {
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app)
        .post(`/api/tasks/lists/${listId}/tasks`)
        .set("Cookie", managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req.send({
        title: "New Task",
        description: "Task Description",
        story_points: 3,
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("title", "New Task");
      expect(response.body).toHaveProperty("list_id", listId);
    });

    it("should reject task creation by member", async () => {
      const { token: csrfToken } = await getCsrfToken(memberCookies);
      let req = request(app)
        .post(`/api/tasks/lists/${listId}/tasks`)
        .set("Cookie", memberCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req.send({
        title: "Member Task",
      });

      expect(response.status).toBe(403);
    });

    it("should validate required fields", async () => {
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app)
        .post(`/api/tasks/lists/${listId}/tasks`)
        .set("Cookie", managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req.send({});

      expect(response.status).toBe(400);
    });

    it("should require authentication", async () => {
      const response = await request(app)
        .post(`/api/tasks/lists/${listId}/tasks`)
        .send({ title: "Unauthorized Task" });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/tasks/:id", () => {
    let taskId: string;

    beforeEach(async () => {
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app)
        .post(`/api/tasks/lists/${listId}/tasks`)
        .set("Cookie", managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const createResponse = await req.send({
        title: "Test Task",
      });

      taskId = createResponse.body.id;
    });

    it("should return task by id", async () => {
      const response = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set("Cookie", memberCookies);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", taskId);
      expect(response.body).toHaveProperty("title", "Test Task");
    });

    it("should return 404 for non-existent task", async () => {
      const response = await request(app)
        .get("/api/tasks/00000000-0000-0000-0000-000000000000")
        .set("Cookie", memberCookies);

      expect(response.status).toBe(404);
    });

    it("should require authentication", async () => {
      const response = await request(app).get(`/api/tasks/${taskId}`);

      expect(response.status).toBe(401);
    });
  });

  describe("PUT /api/tasks/:id", () => {
    let taskId: string;

    beforeEach(async () => {
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app)
        .post(`/api/tasks/lists/${listId}/tasks`)
        .set("Cookie", managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const createResponse = await req.send({
        title: "Original Task",
      });

      taskId = createResponse.body.id;
    });

    it("should update task as manager", async () => {
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app)
        .put(`/api/tasks/${taskId}`)
        .set("Cookie", managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req.send({
        title: "Updated Task",
        description: "Updated Description",
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("title", "Updated Task");
    });

    it("should reject update by member", async () => {
      const { token: csrfToken } = await getCsrfToken(memberCookies);
      let req = request(app)
        .put(`/api/tasks/${taskId}`)
        .set("Cookie", memberCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req.send({ title: "Hacked Task" });

      expect(response.status).toBe(403);
    });

    it("should require authentication", async () => {
      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send({ title: "Unauthorized Update" });

      expect(response.status).toBe(401);
    });
  });

  describe("PATCH /api/tasks/:id/assign", () => {
    let taskId: string;

    beforeEach(async () => {
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app)
        .post(`/api/tasks/lists/${listId}/tasks`)
        .set("Cookie", managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const createResponse = await req.send({
        title: "Task to Assign",
      });

      taskId = createResponse.body.id;
    });

    it("should assign task as manager", async () => {
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app)
        .patch(`/api/tasks/${taskId}/assign`)
        .set("Cookie", managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req.send({
        assigned_to: userId,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("assigned_to", userId);
    });

    it("should reject assignment by member", async () => {
      const { token: csrfToken } = await getCsrfToken(memberCookies);
      let req = request(app)
        .patch(`/api/tasks/${taskId}/assign`)
        .set("Cookie", memberCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req.send({
        assigned_to: userId,
      });

      expect(response.status).toBe(403);
    });

    it("should require authentication", async () => {
      const response = await request(app)
        .patch(`/api/tasks/${taskId}/assign`)
        .send({ assigned_to: userId });

      expect(response.status).toBe(401);
    });
  });

  describe("PATCH /api/tasks/:id/complete", () => {
    let taskId: string;

    beforeEach(async () => {
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app)
        .post(`/api/tasks/lists/${listId}/tasks`)
        .set("Cookie", managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const createResponse = await req.send({
        title: "Task to Complete",
        story_points: 5,
      });

      taskId = createResponse.body.id;
    });

    it("should complete task and award points", async () => {
      const { token: csrfToken } = await getCsrfToken(memberCookies);
      let req = request(app)
        .patch(`/api/tasks/${taskId}/complete`)
        .set("Cookie", memberCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req;

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("completed_at");
      expect(response.body.completed_at).not.toBeNull();
    });

    it("should require authentication", async () => {
      const response = await request(app).patch(
        `/api/tasks/${taskId}/complete`,
      );

      expect(response.status).toBe(401);
    });
  });

  describe("PATCH /api/tasks/:id/move", () => {
    let taskId: string;
    let targetListId: string;

    beforeEach(async () => {
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app)
        .post(`/api/tasks/lists/${listId}/tasks`)
        .set("Cookie", managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const taskResponse = await req.send({
        title: "Task to Move",
      });

      taskId = taskResponse.body.id;

      const { token: listCsrfToken } = await getCsrfToken(managerCookies);
      const listResponse = await request(app)
        .post(`/api/lists/boards/${boardId}/lists`)
        .set("Cookie", managerCookies)
        .set("X-CSRF-Token", listCsrfToken)
        .send({
          name: "Target List",
        });

      targetListId = listResponse.body.id;
    });

    it("should move task as manager", async () => {
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app)
        .patch(`/api/tasks/${taskId}/move`)
        .set("Cookie", managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req.send({
        list_id: targetListId,
        position: 0,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("list_id", targetListId);
    });

    it("should reject move by member", async () => {
      const { token: csrfToken } = await getCsrfToken(memberCookies);
      let req = request(app)
        .patch(`/api/tasks/${taskId}/move`)
        .set("Cookie", memberCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req.send({
        list_id: targetListId,
        position: 0,
      });

      expect(response.status).toBe(403);
    });

    it("should require authentication", async () => {
      const response = await request(app)
        .patch(`/api/tasks/${taskId}/move`)
        .send({
          list_id: targetListId,
          position: 0,
        });

      expect(response.status).toBe(401);
    });
  });

  describe("DELETE /api/tasks/:id", () => {
    let taskId: string;

    beforeEach(async () => {
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app)
        .post(`/api/tasks/lists/${listId}/tasks`)
        .set("Cookie", managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const createResponse = await req.send({
        title: "Task to Delete",
      });

      taskId = createResponse.body.id;
    });

    it("should delete task as manager", async () => {
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app)
        .delete(`/api/tasks/${taskId}`)
        .set("Cookie", managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req;

      expect(response.status).toBe(204);
    });

    it("should reject delete by member", async () => {
      const { token: csrfToken } = await getCsrfToken(memberCookies);
      let req = request(app)
        .delete(`/api/tasks/${taskId}`)
        .set("Cookie", memberCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req;

      expect(response.status).toBe(403);
    });

    it("should require authentication", async () => {
      const response = await request(app).delete(`/api/tasks/${taskId}`);

      expect(response.status).toBe(401);
    });
  });
});
