import { isMockMode } from "@/contracts/container.js";
import { getSupabaseClient } from "@/lib/supabase.js";

export type HealthStatus = {
  ok: boolean;
  db: boolean;
  mock?: boolean;
  cache?: boolean;
  externalApi?: boolean;
};

export async function checkHealth(): Promise<HealthStatus> {
  // In mock mode, skip database check entirely
  // db: true indicates DB check was skipped (not actually verified)
  if (isMockMode()) {
    console.log("Health check: mock mode enabled, DB check skipped");
    return {
      ok: true,
      db: true,
      mock: true,
    };
  }

  let db = false;
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("users").select("id").limit(1);
    db = !error;
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
