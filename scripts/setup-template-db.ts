#!/usr/bin/env bun
/**
 * Creates a template database for integration tests
 * Template is seeded once, then cloned per-worker for fast parallel testing
 */

import { Client } from "pg";
import { runSeed } from "./seed-db-snaplet";

const TEMPLATE_DB_NAME = "gello_test_template";
const MAIN_DB_URL =
  process.env.SUPABASE_DB_URL ||
  process.env.DB_URL ||
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

async function setupTemplateDatabase() {
  console.log("📦 Setting up template database for integration tests...");

  const mainClient = new Client({ connectionString: MAIN_DB_URL });
  await mainClient.connect();

  try {
    // Drop existing template if it exists
    console.log(`🗑️  Dropping existing template database if exists...`);
    await mainClient.query(`DROP DATABASE IF EXISTS ${TEMPLATE_DB_NAME}`);

    // Create template database
    console.log(`✨ Creating template database: ${TEMPLATE_DB_NAME}`);
    await mainClient.query(`CREATE DATABASE ${TEMPLATE_DB_NAME}`);

    await mainClient.end();

    // Connect to template database and apply schema + seed
    const templateDbUrl = MAIN_DB_URL.replace(
      /\/[^/]+$/,
      `/${TEMPLATE_DB_NAME}`,
    );
    const templateClient = new Client({ connectionString: templateDbUrl });
    await templateClient.connect();

    console.log("📋 Applying migrations to template database...");
    // Migrations are already in main DB, copy schema
    await templateClient.query(`
      -- Copy schema from main database
      -- This assumes migrations have been applied to main DB
      -- We'll just use pg_dump approach instead
    `);

    await templateClient.end();

    // Actually, use Supabase CLI to apply migrations to template
    const { spawn } = await import("node:child_process");
    const supabaseUrl = MAIN_DB_URL.replace(
      "/postgres",
      `/${TEMPLATE_DB_NAME}`,
    );

    console.log("🔄 Applying Supabase migrations to template...");
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(
        "bunx",
        [
          "supabase",
          "db",
          "push",
          "--db-url",
          supabaseUrl,
          "--include-seed=false",
        ],
        { stdio: "inherit" },
      );

      proc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Migration failed with code ${code}`));
      });
    });

    // Seed the template database
    console.log("🌱 Seeding template database...");
    process.env.DB_URL = templateDbUrl;
    await runSeed({ dryRun: false, skipReset: true });

    console.log("✅ Template database ready!");
    console.log(`📌 Template: ${TEMPLATE_DB_NAME}`);
    console.log(`📌 Each test worker will clone from this template`);
  } catch (error) {
    console.error("❌ Failed to setup template database:", error);
    process.exit(1);
  }
}

setupTemplateDatabase();
