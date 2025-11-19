import { copycat } from "@snaplet/copycat";
import { SeedPg } from "@snaplet/seed/adapter-pg";
import { defineConfig } from "@snaplet/seed/config";
import { Client } from "pg";

function getConnectionString(): string {
  const connectionString =
    process.env.DB_URL ??
    process.env.SUPABASE_DB_URL ??
    process.env.SUPABASE_LOCAL_DB_URL ??
    process.env.POSTGRES_URL;

  if (!connectionString) {
    throw new Error(
      "Database connection string not set. Set DB_URL, SUPABASE_DB_URL, SUPABASE_LOCAL_DB_URL, or POSTGRES_URL environment variable.",
    );
  }

  return connectionString;
}

export const SNAPLET_SEED_VALUE =
  process.env.SNAPLET_SEED ?? "gello-phase-3-seed";

export const USER_ROLE_CHOICES = ["admin", "manager", "member"] as const;
export const POINTS_REASON_CHOICES = ["task_complete", "manual_award"] as const;

export function deterministicUserRole(seed = SNAPLET_SEED_VALUE) {
  return copycat.oneOf(seed, [...USER_ROLE_CHOICES]);
}

export function deterministicPointsReason(seed = SNAPLET_SEED_VALUE) {
  return copycat.oneOf(seed, [...POINTS_REASON_CHOICES]);
}

export default defineConfig({
  alias: {
    inflection: true,
  },
  adapter: async () => {
    const connectionString = getConnectionString();
    const client = new Client({ connectionString });
    await client.connect();
    return new SeedPg(client);
  },
  select: ["!*", "public.*", "auth.users", "auth.identities"],
});
