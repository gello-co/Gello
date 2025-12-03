/**
 * Integration tests for points API
 * Tests leaderboard, user points, and manual point awards
 */

import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { app } from "../../ProjectSourceCode/src/express/app.js";
import {
  createTestUser,
  generateTestEmail,
  getCsrfToken,
  loginAsUser,
  prepareTestDb,
  setCsrfHeadersIfEnabled,
} from "../setup/helpers/index.js";

describe("Points API", () => {
  let adminCookies: string = "";
  let memberCookies: string = "";
  let userId: string;

  beforeAll(async () => {
    await prepareTestDb();

    // Create fresh users for this test file
    const adminEmail = generateTestEmail("points-admin");
    const memberEmail = generateTestEmail("points-member");

    const _admin = await createTestUser(
      adminEmail,
      "password123",
      "admin",
      "Admin User",
    );
    const member = await createTestUser(
      memberEmail,
      "password123",
      "member",
      "Member User",
    );

    userId = member.user.id;

    const { cookieHeader: adminCookieHeader } = await loginAsUser(
      adminEmail,
      "password123",
    );
    adminCookies = adminCookieHeader;

    const { cookieHeader: memberCookieHeader } = await loginAsUser(
      memberEmail,
      "password123",
    );
    memberCookies = memberCookieHeader;
  });

  describe("GET /api/points/leaderboard", () => {
    it("should return leaderboard for authenticated user", async () => {
      const response = await request(app)
        .get("/api/points/leaderboard")
        .set("Cookie", memberCookies);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it("should accept limit query parameter", async () => {
      const response = await request(app)
        .get("/api/points/leaderboard")
        .query({ limit: "10" })
        .set("Cookie", memberCookies);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it("should require authentication", async () => {
      const response = await request(app).get("/api/points/leaderboard");

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/points/users/:id/points", () => {
    it("should return user points", async () => {
      const response = await request(app)
        .get(`/api/points/users/${userId}/points`)
        .set("Cookie", memberCookies);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("user_id", userId);
      expect(response.body).toHaveProperty("total_points");
    });

    it("should require authentication", async () => {
      const response = await request(app).get(
        `/api/points/users/${userId}/points`,
      );

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/points/users/:id/points", () => {
    it("should award points manually as admin", async () => {
      const { token: csrfToken } = await getCsrfToken(adminCookies);
      let req = request(app)
        .post(`/api/points/users/${userId}/points`)
        .set("Cookie", adminCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req.send({
        points_earned: 10,
        reason: "bonus",
        notes: "Test bonus points",
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("points_earned", 10);
      expect(response.body).toHaveProperty("user_id", userId);
    });

    it("should reject manual award by member", async () => {
      const { token: csrfToken } = await getCsrfToken(memberCookies);
      let req = request(app)
        .post(`/api/points/users/${userId}/points`)
        .set("Cookie", memberCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req.send({
        points_earned: 10,
        reason: "bonus",
      });

      expect(response.status).toBe(403);
    });

    it("should validate required fields", async () => {
      const { token: csrfToken } = await getCsrfToken(adminCookies);
      let req = request(app)
        .post(`/api/points/users/${userId}/points`)
        .set("Cookie", adminCookies);
      req = setCsrfHeadersIfEnabled(req, csrfToken);
      const response = await req.send({});

      expect(response.status).toBe(400);
    });

    it("should require authentication", async () => {
      const response = await request(app)
        .post(`/api/points/users/${userId}/points`)
        .send({
          points_earned: 10,
          reason: "bonus",
        });

      expect(response.status).toBe(401);
    });
  });
});
