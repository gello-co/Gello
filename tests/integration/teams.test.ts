/**
 * Integration tests for teams API
 * Tests CRUD operations and team member management
 */

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../../ProjectSourceCode/src/server/app.js";
import {
  createTestUser,
  loginAsAdmin,
  loginAsUser,
  resetTestDb,
} from "../setup/helpers.js";

describe("Teams API", () => {
  let adminCookies: string[] = [];
  let managerCookies: string[] = [];
  let memberCookies: string[] = [];
  let teamId: string;

  beforeEach(async () => {
    await resetTestDb();

    // Create users with different roles
    await createTestUser(
      "admin@test.com",
      "password123",
      "admin",
      "Admin User",
    );
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

    // Get session cookies for each role
    const adminSession = await loginAsUser("admin@test.com", "password123");
    adminCookies = [
      `sb-access-token=${adminSession.access_token}`,
      `sb-refresh-token=${adminSession.refresh_token}`,
    ];

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
  });

  describe("GET /api/teams", () => {
    it("should return all teams for authenticated user", async () => {
      const response = await request(app)
        .get("/api/teams")
        .set("Cookie", memberCookies);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it("should require authentication", async () => {
      const response = await request(app).get("/api/teams");

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/teams/:id", () => {
    beforeEach(async () => {
      // Create a team for testing
      const createResponse = await request(app)
        .post("/api/teams")
        .set("Cookie", managerCookies)
        .send({ name: "Test Team" });

      teamId = createResponse.body.id;
    });

    it("should return team by id", async () => {
      const response = await request(app)
        .get(`/api/teams/${teamId}`)
        .set("Cookie", memberCookies);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", teamId);
      expect(response.body).toHaveProperty("name", "Test Team");
    });

    it("should return 404 for non-existent team", async () => {
      const response = await request(app)
        .get("/api/teams/00000000-0000-0000-0000-000000000000")
        .set("Cookie", memberCookies);

      expect(response.status).toBe(404);
    });

    it("should require authentication", async () => {
      const response = await request(app).get(`/api/teams/${teamId}`);

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/teams", () => {
    it("should create team as manager", async () => {
      const response = await request(app)
        .post("/api/teams")
        .set("Cookie", managerCookies)
        .send({ name: "New Team" });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("name", "New Team");
    });

    it("should create team as admin", async () => {
      const response = await request(app)
        .post("/api/teams")
        .set("Cookie", adminCookies)
        .send({ name: "Admin Team" });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("name", "Admin Team");
    });

    it("should reject team creation by member", async () => {
      const response = await request(app)
        .post("/api/teams")
        .set("Cookie", memberCookies)
        .send({ name: "Member Team" });

      expect(response.status).toBe(403);
    });

    it("should validate required fields", async () => {
      const response = await request(app)
        .post("/api/teams")
        .set("Cookie", managerCookies)
        .send({});

      expect(response.status).toBe(400);
    });

    it("should require authentication", async () => {
      const response = await request(app)
        .post("/api/teams")
        .send({ name: "Unauthorized Team" });

      expect(response.status).toBe(401);
    });
  });

  describe("PUT /api/teams/:id", () => {
    beforeEach(async () => {
      const createResponse = await request(app)
        .post("/api/teams")
        .set("Cookie", managerCookies)
        .send({ name: "Original Team" });

      teamId = createResponse.body.id;
    });

    it("should update team as manager", async () => {
      const response = await request(app)
        .put(`/api/teams/${teamId}`)
        .set("Cookie", managerCookies)
        .send({ name: "Updated Team" });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("name", "Updated Team");
    });

    it("should reject update by member", async () => {
      const response = await request(app)
        .put(`/api/teams/${teamId}`)
        .set("Cookie", memberCookies)
        .send({ name: "Hacked Team" });

      expect(response.status).toBe(403);
    });

    it("should require authentication", async () => {
      const response = await request(app)
        .put(`/api/teams/${teamId}`)
        .send({ name: "Unauthorized Update" });

      expect(response.status).toBe(401);
    });
  });

  describe("DELETE /api/teams/:id", () => {
    beforeEach(async () => {
      const createResponse = await request(app)
        .post("/api/teams")
        .set("Cookie", managerCookies)
        .send({ name: "Team to Delete" });

      teamId = createResponse.body.id;
    });

    it("should delete team as admin", async () => {
      const response = await request(app)
        .delete(`/api/teams/${teamId}`)
        .set("Cookie", adminCookies);

      expect(response.status).toBe(204);
    });

    it("should reject delete by manager", async () => {
      const response = await request(app)
        .delete(`/api/teams/${teamId}`)
        .set("Cookie", managerCookies);

      expect(response.status).toBe(403);
    });

    it("should reject delete by member", async () => {
      const response = await request(app)
        .delete(`/api/teams/${teamId}`)
        .set("Cookie", memberCookies);

      expect(response.status).toBe(403);
    });

    it("should require authentication", async () => {
      const response = await request(app).delete(`/api/teams/${teamId}`);

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/teams/:id/members", () => {
    beforeEach(async () => {
      const createResponse = await request(app)
        .post("/api/teams")
        .set("Cookie", managerCookies)
        .send({ name: "Team with Members" });

      teamId = createResponse.body.id;
    });

    it("should return team members", async () => {
      const response = await request(app)
        .get(`/api/teams/${teamId}/members`)
        .set("Cookie", memberCookies);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it("should require authentication", async () => {
      const response = await request(app).get(`/api/teams/${teamId}/members`);

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/teams/:id/members", () => {
    let userId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post("/api/teams")
        .set("Cookie", managerCookies)
        .send({ name: "Team for Members" });

      teamId = createResponse.body.id;

      // Create a user to add to team
      const user = await createTestUser(
        "newmember@test.com",
        "password123",
        "member",
        "New Member",
      );
      userId = user.user.id;
    });

    it("should add member to team as manager", async () => {
      const response = await request(app)
        .post(`/api/teams/${teamId}/members`)
        .set("Cookie", managerCookies)
        .send({ user_id: userId });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id", userId);
      expect(response.body).toHaveProperty("team_id", teamId);
    });

    it("should reject adding member by regular member", async () => {
      const response = await request(app)
        .post(`/api/teams/${teamId}/members`)
        .set("Cookie", memberCookies)
        .send({ user_id: userId });

      expect(response.status).toBe(403);
    });

    it("should validate user_id is required", async () => {
      const response = await request(app)
        .post(`/api/teams/${teamId}/members`)
        .set("Cookie", managerCookies)
        .send({});

      expect(response.status).toBe(400);
    });

    it("should require authentication", async () => {
      const response = await request(app)
        .post(`/api/teams/${teamId}/members`)
        .send({ user_id: userId });

      expect(response.status).toBe(401);
    });
  });

  describe("DELETE /api/teams/:teamId/members/:userId", () => {
    let userId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post("/api/teams")
        .set("Cookie", managerCookies)
        .send({ name: "Team for Removal" });

      teamId = createResponse.body.id;

      // Create and add user to team
      const user = await createTestUser(
        "removemember@test.com",
        "password123",
        "member",
        "Remove Member",
      );
      userId = user.user.id;

      await request(app)
        .post(`/api/teams/${teamId}/members`)
        .set("Cookie", managerCookies)
        .send({ user_id: userId });
    });

    it("should remove member from team as manager", async () => {
      const response = await request(app)
        .delete(`/api/teams/${teamId}/members/${userId}`)
        .set("Cookie", managerCookies);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", userId);
      expect(response.body.team_id).toBeNull();
    });

    it("should reject removal by regular member", async () => {
      const response = await request(app)
        .delete(`/api/teams/${teamId}/members/${userId}`)
        .set("Cookie", memberCookies);

      expect(response.status).toBe(403);
    });

    it("should require authentication", async () => {
      const response = await request(app).delete(
        `/api/teams/${teamId}/members/${userId}`,
      );

      expect(response.status).toBe(401);
    });
  });
});
