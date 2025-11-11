/**
 * Integration tests for tasks API
 * Tests CRUD operations, task assignment, completion, and movement
 */

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../../ProjectSourceCode/src/server/app.js";
import { createTestUser, loginAsUser, resetTestDb } from "../setup/helpers.js";

describe("Tasks API", () => {
  let managerCookies: string[] = [];
  let memberCookies: string[] = [];
  let teamId: string;
  let boardId: string;
  let listId: string;
  let userId: string;

  beforeEach(async () => {
    await resetTestDb();

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
    const teamResponse = await request(app)
      .post("/api/teams")
      .set("Cookie", managerCookies)
      .send({ name: "Test Team" });

    teamId = teamResponse.body.id;

    const boardResponse = await request(app)
      .post("/api/boards")
      .set("Cookie", managerCookies)
      .send({
        name: "Test Board",
        team_id: teamId,
      });

    boardId = boardResponse.body.id;

    const listResponse = await request(app)
      .post(`/api/lists/boards/${boardId}/lists`)
      .set("Cookie", managerCookies)
      .send({
        name: "Test List",
      });

    listId = listResponse.body.id;
  });

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
      const response = await request(app)
        .post(`/api/tasks/lists/${listId}/tasks`)
        .set("Cookie", managerCookies)
        .send({
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
      const response = await request(app)
        .post(`/api/tasks/lists/${listId}/tasks`)
        .set("Cookie", memberCookies)
        .send({
          title: "Member Task",
        });

      expect(response.status).toBe(403);
    });

    it("should validate required fields", async () => {
      const response = await request(app)
        .post(`/api/tasks/lists/${listId}/tasks`)
        .set("Cookie", managerCookies)
        .send({});

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
      const createResponse = await request(app)
        .post(`/api/tasks/lists/${listId}/tasks`)
        .set("Cookie", managerCookies)
        .send({
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
      const createResponse = await request(app)
        .post(`/api/tasks/lists/${listId}/tasks`)
        .set("Cookie", managerCookies)
        .send({
          title: "Original Task",
        });

      taskId = createResponse.body.id;
    });

    it("should update task as manager", async () => {
      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set("Cookie", managerCookies)
        .send({
          title: "Updated Task",
          description: "Updated Description",
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("title", "Updated Task");
    });

    it("should reject update by member", async () => {
      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set("Cookie", memberCookies)
        .send({ title: "Hacked Task" });

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
      const createResponse = await request(app)
        .post(`/api/tasks/lists/${listId}/tasks`)
        .set("Cookie", managerCookies)
        .send({
          title: "Task to Assign",
        });

      taskId = createResponse.body.id;
    });

    it("should assign task as manager", async () => {
      const response = await request(app)
        .patch(`/api/tasks/${taskId}/assign`)
        .set("Cookie", managerCookies)
        .send({
          assigned_to: userId,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("assigned_to", userId);
    });

    it("should reject assignment by member", async () => {
      const response = await request(app)
        .patch(`/api/tasks/${taskId}/assign`)
        .set("Cookie", memberCookies)
        .send({
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
      const createResponse = await request(app)
        .post(`/api/tasks/lists/${listId}/tasks`)
        .set("Cookie", managerCookies)
        .send({
          title: "Task to Complete",
          story_points: 5,
        });

      taskId = createResponse.body.id;
    });

    it("should complete task and award points", async () => {
      const response = await request(app)
        .patch(`/api/tasks/${taskId}/complete`)
        .set("Cookie", memberCookies);

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
      const taskResponse = await request(app)
        .post(`/api/tasks/lists/${listId}/tasks`)
        .set("Cookie", managerCookies)
        .send({
          title: "Task to Move",
        });

      taskId = taskResponse.body.id;

      const listResponse = await request(app)
        .post(`/api/lists/boards/${boardId}/lists`)
        .set("Cookie", managerCookies)
        .send({
          name: "Target List",
        });

      targetListId = listResponse.body.id;
    });

    it("should move task as manager", async () => {
      const response = await request(app)
        .patch(`/api/tasks/${taskId}/move`)
        .set("Cookie", managerCookies)
        .send({
          list_id: targetListId,
          position: 0,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("list_id", targetListId);
    });

    it("should reject move by member", async () => {
      const response = await request(app)
        .patch(`/api/tasks/${taskId}/move`)
        .set("Cookie", memberCookies)
        .send({
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
      const createResponse = await request(app)
        .post(`/api/tasks/lists/${listId}/tasks`)
        .set("Cookie", managerCookies)
        .send({
          title: "Task to Delete",
        });

      taskId = createResponse.body.id;
    });

    it("should delete task as manager", async () => {
      const response = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set("Cookie", managerCookies);

      expect(response.status).toBe(204);
    });

    it("should reject delete by member", async () => {
      const response = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set("Cookie", memberCookies);

      expect(response.status).toBe(403);
    });

    it("should require authentication", async () => {
      const response = await request(app).delete(`/api/tasks/${taskId}`);

      expect(response.status).toBe(401);
    });
  });
});
