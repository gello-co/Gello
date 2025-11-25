import { checkDatabaseConnection } from "@/lib/database/drizzle.js";

export type HealthStatus = {
  ok: boolean;
  db: boolean;
  cache?: boolean;
  externalApi?: boolean;
};

export async function checkHealth(): Promise<HealthStatus> {
  let db = false;
  try {
    db = await checkDatabaseConnection();
  } catch (error) {
    console.error("Health check: Database connection failed", error);
    db = false;
  }
  // Future components (cache, externalApi, etc.) should be added here and ANDed into ok
  const components = { db };
  const ok = Object.values(components).every(Boolean);
  return {
    ok,
    ...components,
  };
}
