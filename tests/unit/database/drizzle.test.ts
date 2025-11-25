import { describe, expect, it } from "bun:test";
import { sql } from "drizzle-orm";
import { checkDatabaseConnection, db } from "@/lib/database/drizzle";

describe("Drizzle Database Connection", () => {
  // Note: Don't close DB connection here - shared singleton is cleaned up by process exit
  // Closing it in afterAll breaks other tests running in parallel

  it("should connect to the database successfully", async () => {
    const isConnected = await checkDatabaseConnection();
    expect(isConnected).toBe(true);
  });

  it("should execute a basic query", async () => {
    const result = await db.execute(sql`SELECT 1 as val`);
    expect(result).toBeDefined();
    expect(result[0]?.val).toBe(1);
  });

  it("should handle concurrent queries (pooling)", async () => {
    const promises = Array.from({ length: 5 }, () =>
      db.execute(sql`SELECT 1 as value`),
    );

    const results = await Promise.all(promises);
    expect(results).toBeDefined();
    expect(results.length).toBe(5);
    results.forEach((result) => {
      expect(result).toBeDefined();
      expect(result[0]?.value).toBe(1);
    });
  });
});
