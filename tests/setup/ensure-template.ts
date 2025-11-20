/**
 * Ensures template database exists (creates it automatically if needed)
 * Uses file locking to ensure only one worker creates the template
 */

import { Client } from "pg";
import { logger } from "../../ProjectSourceCode/src/server/lib/logger.js";
import { spawn } from "node:child_process";

const TEMPLATE_DB_NAME = "gello_test_template";
const MAIN_DB_URL =
  process.env.SUPABASE_DB_URL ||
  process.env.DB_URL ||
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

let templateCreated = false;

export async function ensureTemplateExists(): Promise<void> {
  // Fast path: template already exists (checked in this process)
  if (templateCreated) {
    return;
  }

  const requestId = crypto.randomUUID();
  logger.info(
    { requestId, template: TEMPLATE_DB_NAME },
    "[template] Checking if template exists",
  );

  const mainClient = new Client({ connectionString: MAIN_DB_URL });
  let clientConnected = false;

  try {
    await mainClient.connect();
    clientConnected = true;

    // Check if template database exists
    const { rows } = await mainClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [TEMPLATE_DB_NAME],
    );

    if (rows.length > 0) {
      logger.info({ requestId }, "[template] Template database already exists");
      templateCreated = true;
      await mainClient.end();
      clientConnected = false;
      return;
    }

    // Template doesn't exist - acquire lock and create it
    logger.info(
      { requestId },
      "[template] Template database not found, creating...",
    );

    // Use advisory lock to ensure only one process creates template
    await mainClient.query("SELECT pg_advisory_lock(12345)");

    try {
      // Double-check after acquiring lock (another process might have created it)
      const { rows: recheckRows } = await mainClient.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`,
        [TEMPLATE_DB_NAME],
      );

      if (recheckRows.length > 0) {
        logger.info(
          { requestId },
          "[template] Template was created while waiting for lock",
        );
        templateCreated = true;
        // Release lock before closing connection
        await mainClient.query("SELECT pg_advisory_unlock(12345)");
        await mainClient.end();
        clientConnected = false;
        return;
      }

      // Create empty template database
      logger.info({ requestId }, "[template] Creating empty template database");
      await mainClient.query(`CREATE DATABASE ${TEMPLATE_DB_NAME}`);

      // Close connection before using external processes (no longer needed)
      await mainClient.end();
      clientConnected = false;

      // Use pg_dump to copy schema from postgres to template
      logger.info(
        { requestId },
        "[template] Copying schema from postgres to template",
      );

      await new Promise<void>((resolve, reject) => {
        const pgDump = spawn("pg_dump", [
          "--schema-only",
          "--no-owner",
          "--no-privileges",
          MAIN_DB_URL,
        ]);

        const psql = spawn("psql", [
          MAIN_DB_URL.replace(/\/[^/]+$/, `/${TEMPLATE_DB_NAME}`),
        ]);

        pgDump.stdout.pipe(psql.stdin);

        let pgDumpStderr = "";
        let psqlStderr = "";

        pgDump.stderr.on("data", (data) => {
          pgDumpStderr += data.toString();
        });

        psql.stderr.on("data", (data) => {
          psqlStderr += data.toString();
        });

        psql.on("close", (code) => {
          if (code === 0) {
            resolve();
          } else {
            logger.error(
              { requestId, pgDumpStderr, psqlStderr },
              "[template] Schema copy failed",
            );
            reject(
              new Error(
                `psql failed with code ${code}\npsql stderr: ${psqlStderr}\npg_dump stderr: ${pgDumpStderr}`,
              ),
            );
          }
        });

        pgDump.on("error", (err) => {
          logger.error(
            { requestId, error: err.message },
            "[template] pg_dump spawn error",
          );
          reject(err);
        });

        psql.on("error", (err) => {
          logger.error(
            { requestId, error: err.message },
            "[template] psql spawn error",
          );
          reject(err);
        });
      });

      // Connect to template and seed it
      const templateDbUrl = MAIN_DB_URL.replace(
        /\/[^/]+$/,
        `/${TEMPLATE_DB_NAME}`,
      );
      logger.info({ requestId }, "[template] Seeding template database");

      // Note: seed-simple.ts uses Supabase client, not direct DB connection
      // The seed script will use the current Supabase environment variables
      // Template database is already set up with schema, seed will populate data
      try {
        // Run seed script via bun (uses Supabase env vars from bun-setup.ts)
        await new Promise<void>((resolve, reject) => {
          const seedProcess = spawn("bun", ["run", "scripts/seed-simple.ts"], {
            env: process.env,
          });

          let stdout = "";
          let stderr = "";

          seedProcess.stdout?.on("data", (data) => {
            stdout += data.toString();
          });

          seedProcess.stderr?.on("data", (data) => {
            stderr += data.toString();
          });

          seedProcess.on("close", (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(
                new Error(
                  `Seed script failed with code ${code}\nstdout: ${stdout}\nstderr: ${stderr}`,
                ),
              );
            }
          });

          seedProcess.on("error", (err) => {
            reject(err);
          });
        });
        logger.info(
          { requestId },
          "[template] Template database created and seeded successfully",
        );
      } finally {
        // Restore original DB_URL
        if (originalDbUrl) {
          process.env.DB_URL = originalDbUrl;
        }
      }

      templateCreated = true;
    } finally {
      // Release advisory lock
      const lockClient = new Client({ connectionString: MAIN_DB_URL });
      await lockClient.connect();
      await lockClient.query("SELECT pg_advisory_unlock(12345)");
      await lockClient.end();
    }
  } catch (error) {
    logger.error(
      {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      },
      "[template] Failed to ensure template exists",
    );
    throw error;
  } finally {
    // Ensure client is closed
    if (clientConnected) {
      await mainClient.end();
    }
  }
}
