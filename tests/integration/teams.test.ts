/**
 * Integration tests for teams API
 * Tests CRUD operations and team member management
 */

import { beforeAll, beforeEach, describe, expect, it } from "bun:test";
import request from "supertest";
import { app } from "../../ProjectSourceCode/src/express/app.js";
import {
  createTestUser,
  generateTestEmail,
  getCsrfToken,
  loginAsUser,
  prepareTestDb,
  setCsrfHeadersIfEnabled,
} from "../setup/helpers/index.js";

describe("Teams API", () => {
  let adminCookies: string = "";
  let managerCookies: string = "";
  let memberCookies: string = "";
  let teamId: string;

  beforeAll(async () => {
    await prepareTestDb();

    // Create fresh users with different roles for this test file
    // Using generateTestEmail ensures unique users per test run
    const adminEmail = generateTestEmail("teams-admin");
    const managerEmail = generateTestEmail("teams-manager");
    const memberEmail = generateTestEmail("teams-member");

    const _adminUser = await createTestUser(
      adminEmail,
      "password123",
      "admin",
      "Admin User",
    );
    const _managerUser = await createTestUser(
      managerEmail,
      "password123",
      "manager",
      "Manager User",
    );
    const _memberUser = await createTestUser(
      memberEmail,
      "password123",
      "member",
      "Member User",
    );

    // Login via app endpoint and get cookies
    const { cookieHeader: adminCookieHeader } = await loginAsUser(
      adminEmail,
      "password123",
    );
    adminCookies = adminCookieHeader;

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
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app).post("/api/teams").set("Cookie", managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const createResponse = await req.send({ name: "Test Team" });

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
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app).post("/api/teams").set("Cookie", managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req.send({ name: "New Team" });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("name", "New Team");
    });

    it("should create team as admin", async () => {
      const { token: csrfToken } = await getCsrfToken(adminCookies);
      let req = request(app).post("/api/teams").set("Cookie", adminCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req.send({ name: "Admin Team" });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("name", "Admin Team");
    });

    it("should reject team creation by member", async () => {
      const { token: csrfToken } = await getCsrfToken(memberCookies);
      let req = request(app).post("/api/teams").set("Cookie", memberCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req.send({ name: "Member Team" });

      expect(response.status).toBe(403);
    });

    it("should validate required fields", async () => {
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app).post("/api/teams").set("Cookie", managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req.send({});

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
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app).post("/api/teams").set("Cookie", managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const createResponse = await req.send({ name: "Original Team" });

      teamId = createResponse.body.id;
    });

    it("should update team as manager", async () => {
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app)
        .put(`/api/teams/${teamId}`)
        .set("Cookie", managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req.send({ name: "Updated Team" });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("name", "Updated Team");
    });

    it("should reject update by member", async () => {
      const { token: csrfToken } = await getCsrfToken(memberCookies);
      let req = request(app)
        .put(`/api/teams/${teamId}`)
        .set("Cookie", memberCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req.send({ name: "Hacked Team" });

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
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app).post("/api/teams").set("Cookie", managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const createResponse = await req.send({ name: "Team to Delete" });

      teamId = createResponse.body.id;
    });

    it("should delete team as admin", async () => {
      const { token: csrfToken } = await getCsrfToken(adminCookies);
      let req = request(app)
        .delete(`/api/teams/${teamId}`)
        .set("Cookie", adminCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req;

      expect(response.status).toBe(204);
    });

    it("should reject delete by manager", async () => {
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app)
        .delete(`/api/teams/${teamId}`)
        .set("Cookie", managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req;

      expect(response.status).toBe(403);
    });

    it("should reject delete by member", async () => {
      const { token: csrfToken } = await getCsrfToken(memberCookies);
      let req = request(app)
        .delete(`/api/teams/${teamId}`)
        .set("Cookie", memberCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req;

      expect(response.status).toBe(403);
    });

    it("should require authentication", async () => {
      const response = await request(app).delete(`/api/teams/${teamId}`);

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/teams/:id/members", () => {
    beforeEach(async () => {
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app).post("/api/teams").set("Cookie", managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const createResponse = await req.send({ name: "Team with Members" });

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
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app).post("/api/teams").set("Cookie", managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const createResponse = await req.send({ name: "Team for Members" });

      teamId = createResponse.body.id;

      // Create a user to add to team
      const newMemberEmail = generateTestEmail("teams-newmember");
      const user = await createTestUser(
        newMemberEmail,
        "password123",
        "member",
        "New Member",
      );
      userId = user.user.id;
    });

    it("should add member to team as manager", async () => {
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app)
        .post(`/api/teams/${teamId}/members`)
        .set("Cookie", managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req.send({ user_id: userId });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id", userId);
      expect(response.body).toHaveProperty("team_id", teamId);
    });

    it("should reject adding member by regular member", async () => {
      const { token: csrfToken } = await getCsrfToken(memberCookies);
      let req = request(app)
        .post(`/api/teams/${teamId}/members`)
        .set("Cookie", memberCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req.send({ user_id: userId });

      expect(response.status).toBe(403);
    });

    it("should validate user_id is required", async () => {
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app)
        .post(`/api/teams/${teamId}/members`)
        .set("Cookie", managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req.send({});

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
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app).post("/api/teams").set("Cookie", managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const createResponse = await req.send({ name: "Team for Removal" });

      teamId = createResponse.body.id;

      // Create and add user to team
      const removeMemberEmail = generateTestEmail("teams-removemember");
      const user = await createTestUser(
        removeMemberEmail,
        "password123",
        "member",
        "Remove Member",
      );
      userId = user.user.id;

      const { token: addMemberCsrfToken, cookies: addMemberCookies } =
        await getCsrfToken(managerCookies);
      let addMemberReq = request(app)
        .post(`/api/teams/${teamId}/members`)
        .set("Cookie", addMemberCookies);
      addMemberReq = setCsrfHeadersIfEnabled(addMemberReq, addMemberCsrfToken);
      await addMemberReq.send({ user_id: userId });
    });

    it("should remove member from team as manager", async () => {
      const { token: csrfToken } = await getCsrfToken(managerCookies);
      let req = request(app)
        .delete(`/api/teams/${teamId}/members/${userId}`)
        .set("Cookie", managerCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req;

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", userId);
      expect(response.body.team_id).toBeNull();
    });

    it("should reject removal by regular member", async () => {
      const { token: csrfToken } = await getCsrfToken(memberCookies);
      let req = request(app)
        .delete(`/api/teams/${teamId}/members/${userId}`)
        .set("Cookie", memberCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req;

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
