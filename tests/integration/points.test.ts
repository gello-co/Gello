/**
 * Integration tests for points API
 * Tests leaderboard, user points, and manual point awards
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

describe("Points API", () => {
  let adminCookies: string[] = [];
  let memberCookies: string[] = [];
  let userId: string;

  beforeEach(async () => {
    await resetTestDb();

    const admin = await createTestUser(
      "admin@test.com",
      "password123",
      "admin",
      "Admin User",
    );
    const member = await createTestUser(
      "member@test.com",
      "password123",
      "member",
      "Member User",
    );

    userId = member.user.id;

    const adminSession = await loginAsUser("admin@test.com", "password123");
    adminCookies = [
      `sb-access-token=${adminSession.access_token}`,
      `sb-refresh-token=${adminSession.refresh_token}`,
    ];

    const memberSession = await loginAsUser("member@test.com", "password123");
    memberCookies = [
      `sb-access-token=${memberSession.access_token}`,
      `sb-refresh-token=${memberSession.refresh_token}`,
    ];
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
      const csrfToken = await getCsrfToken(adminCookies);
      const response = await request(app)
        .post(`/api/points/users/${userId}/points`)
        .set("Cookie", adminCookies)
        .set("X-CSRF-Token", csrfToken)
        .send({
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
      const csrfToken = await getCsrfToken(memberCookies);
      const response = await request(app)
        .post(`/api/points/users/${userId}/points`)
        .set("Cookie", memberCookies)
        .set("X-CSRF-Token", csrfToken)
        .send({
          points_earned: 10,
          reason: "bonus",
        });

      expect(response.status).toBe(403);
    });

    it("should validate required fields", async () => {
      const csrfToken = await getCsrfToken(adminCookies);
      const response = await request(app)
        .post(`/api/points/users/${userId}/points`)
        .set("Cookie", adminCookies)
        .set("X-CSRF-Token", csrfToken)
        .send({});

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
