import { describe, expect, it } from "bun:test";
import request from "supertest";
import app from "@/index";

describe("Validation Middleware Integration", () => {
  // Note: Don't close DB connection here - shared singleton is cleaned up by process exit

  describe("Deprecated Routes", () => {
    it("should return 410 Gone for deprecated /register route", async () => {
      const response = await request(app)
        .post("/api/register")
        .send({
          username: "test",
          email: "test@example.com",
        })
        .expect(410);

      expect(response.body).toMatchObject({
        error: "This endpoint is deprecated",
        message: expect.stringContaining("/api/auth/register"),
        deprecatedSince: "v0.2.0",
        removedIn: "v0.3.0",
      });
    });

    it("should return 410 Gone for deprecated /createBoard route", async () => {
      const response = await request(app).post("/api/createBoard").expect(410);

      expect(response.body.message).toContain("/api/boards");
    });

    it("should return 410 Gone for deprecated /viewBoards route", async () => {
      const response = await request(app).get("/api/viewBoards").expect(410);

      expect(response.body.message).toContain("/api/boards");
    });

    it("should return 410 Gone for deprecated /updateBoard route", async () => {
      const response = await request(app).put("/api/updateBoard").expect(410);

      expect(response.body.message).toContain("/api/boards/:id");
    });

    it("should return 410 Gone for deprecated /deleteBoard route", async () => {
      const response = await request(app)
        .delete("/api/deleteBoard")
        .expect(410);

      expect(response.body.message).toContain("/api/boards/:id");
    });
  });

  describe("Validation on Modern Routes", () => {
    // Test validation with /api/tasks endpoint
    // Note: /api/boards is not tested here because it has authorization checks
    // that run before validation (returning 403 for users without a team)
    describe("POST /api/tasks", () => {
      it("returns 400 for invalid bodies when the requester is authenticated", async () => {
        const response = await request(app)
          .post("/api/tasks")
          .set("X-Test-Bypass", "true")
          .set("X-Test-User-Id", "validation-task-user")
          .send({
            invalid: "data",
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error");
      });

      it("returns 401 before validation when unauthenticated", async () => {
        const response = await request(app).post("/api/tasks").send({
          invalid: "data",
        });

        expect(response.status).toBe(401);
        expect(response.body).toMatchObject({ error: "Unauthorized" });
      });
    });
  });
  describe("Health Check (no validation needed)", () => {
    it("should return health status without validation", async () => {
      const response = await request(app).get("/api/health");

      // Should be 200 or 503, not 400 (no validation on GET /health)
      expect([200, 503]).toContain(response.status);
    });
  });
});
