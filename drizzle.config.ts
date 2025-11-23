import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load .env files explicitly for drizzle-kit (runs via bunx, may need explicit dotenv)
// Bun automatically loads .env for the main app, but drizzle-kit CLI needs explicit loading
config({ path: ".env" });
config({ path: "ProjectSourceCode/.env.local" });

export default defineConfig({
  schema: "./ProjectSourceCode/src/lib/database/schema/index.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      process.env.SUPABASE_LOCAL_DB_URL ||
      process.env.POSTGRES_URL ||
      (() => {
        throw new Error(
          "DATABASE_URL, SUPABASE_LOCAL_DB_URL, or POSTGRES_URL must be set",
        );
      })(),
  },
  verbose: true,
  strict: true,
  // Exclude Supabase-managed roles from drizzle-kit management
  entities: {
    roles: {
      provider: "supabase",
    },
  },
});
