import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../ProjectSourceCode/src/server/app.ts";

// TODO: These tests are incomplete placeholders
// Proper auth testing is covered in tests/integration/auth.test.ts
describe.skip("Testing registration API", () => {
  it("positive: /register should register a new user and add their info to the database", async () => {
    const res = await request(app).post("/register").send({
      //TODO: write data to send to db
    });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Success");
  });
});

describe.skip("Testing login API", () => {
  it("positive: /login should login user with valid credentials", async () => {
    const res = await request(app).post("/login").send({
      //TODO: write data to send to db
    });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Success");
  });
  it("positive: /login should not login user with invalid credentials", async () => {
    const res = await request(app).post("/login").send({
      //TODO: write data to send to db
    });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Success");
  });
});
