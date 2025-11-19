#!/usr/bin/env bun

import { type RunSeedResult, runSeed } from "../../scripts/seed-db-snaplet";

/**
 * This entrypoint is used by the Supabase CLI to generate SQL output:
 *
 *   bun supabase/seed/seed.ts > supabase/seed.sql
 *
 * When SNAPLET_SEED_DRY_RUN=true (default), Snaplet prints SQL statements
 * instead of executing them. Supabase will consume those statements during
 * `supabase db reset`.
 */
const dryRun = process.env.SNAPLET_SEED_DRY_RUN !== "false";
const skipReset = process.env.SNAPLET_SKIP_RESET === "true";

runSeed({ dryRun, skipReset })
  .then((result: RunSeedResult) => {
    if (!dryRun) {
      const userCount =
        typeof result?.counts?.users === "number" ? result.counts.users : 0;
      console.info(
        `✅ Supabase seed completed for ${userCount} users (skipReset=${skipReset})`,
      );
    }
  })
  .catch((error) => {
    console.error(
      dryRun ? "❌ Supabase seed dry-run failed:" : "❌ Supabase seed failed:",
      error,
    );
    process.exitCode = 1;
  });
