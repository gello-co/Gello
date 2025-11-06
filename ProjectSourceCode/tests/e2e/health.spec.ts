import { expect, request, test } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

test.describe("API health", () => {
  test("GET /api/health responds ok", async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const res = await ctx.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json).toMatchObject({ ok: true });
  });
});
