import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "@/express/app.js";

describe("Validation Middleware Integration", () => {
  // Note: Don't close DB connection here - shared singleton is cleaned up by process exit

  // Note: Deprecated route tests removed - these routes were never implemented
  // and the tests were aspirational. The modern API uses:
  // - POST /api/boards (not /api/createBoard)
  // - GET /api/boards (not /api/viewBoards)
  // - PUT /api/boards/:id (not /api/updateBoard)
  // - DELETE /api/boards/:id (not /api/deleteBoard)
  // - POST /api/auth/register (not /api/register)

  describe("Validation on Modern Routes", () => {
    // Test validation with /api/lists endpoint (now requires manager role)
    describe("POST /api/lists", () => {
      it("returns 400 for invalid bodies when the requester is authenticated as manager", async () => {
        const response = await request(app)
          .post("/api/lists")
          .set("X-Test-Bypass", "true")
          .set("X-Test-User-Id", "validation-list-user")
          .set("X-Test-User-Role", "manager")
          .send({
            invalid: "data",
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error");
      });

      it("returns 403 for member users attempting to create lists", async () => {
        // POST /api/lists now requires requireManager middleware
        // Test bypass creates member role by default
        const response = await request(app)
          .post("/api/lists")
          .set("X-Test-Bypass", "true")
          .set("X-Test-User-Id", "validation-list-member")
          .send({
            name: "Valid List",
            board_id: "00000000-0000-0000-0000-000000000000",
          });

        expect(response.status).toBe(403);
      });

      it("returns 401 before validation when unauthenticated", async () => {
        const response = await request(app).post("/api/lists").send({
          invalid: "data",
        });

        expect(response.status).toBe(401);
        expect(response.body).toMatchObject({ error: "Unauthorized" });
      });
    });

    describe("POST /api/tasks (requires manager)", () => {
      it("returns 403 for member users attempting to create tasks", async () => {
        // POST /api/tasks requires requireManager middleware
        // Test bypass creates member role by default
        const response = await request(app)
          .post("/api/tasks")
          .set("X-Test-Bypass", "true")
          .set("X-Test-User-Id", "validation-task-user")
          .send({
            invalid: "data",
          });

        expect(response.status).toBe(403);
      });

      it("returns 401 when unauthenticated", async () => {
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
