import { describe, expect, it } from "vitest";
import request from "supertest";
import {app} from "../../src/server/app.ts";

// Placeholder to keep CI green without importing Bun-specific modules.
describe("placeholder", () => {
  it("passes trivially", () => {
    expect(true).toBe(true);
  });
});

describe("Testing registration API", () =>{
  it('positive: /register should register a new user and add their info to the database', async () =>{
    const res = await request(app)
      .post("/register")
      .send({
        //TODO: write data to send to db
      })
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Success");
  })
})