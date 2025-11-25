/**
 * Per-worker database management for parallel integration tests
 * Creates a dedicated database for each test worker from template
 */

import { Client } from "pg";
import { logger } from "../../ProjectSourceCode/src/lib/logger.js";

const TEMPLATE_DB_NAME = "gello_test_template";
const MAIN_DB_URL =
  process.env.SUPABASE_DB_URL ||
  process.env.DB_URL ||
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

// Get worker ID from Bun test environment
// Bun doesn't expose worker ID directly, so we use process ID
const WORKER_ID = process.pid;
const WORKER_DB_NAME = `gello_test_worker_${WORKER_ID}`;

let workerDbUrl: string | null = null;

export async function createWorkerDatabase(): Promise<string> {
  if (workerDbUrl) {
    return workerDbUrl;
  }

  const requestId = crypto.randomUUID();
  logger.info(
    { requestId, workerId: WORKER_ID, dbName: WORKER_DB_NAME },
    "[worker-db] Creating worker database",
  );

  const mainClient = new Client({ connectionString: MAIN_DB_URL });
  await mainClient.connect();

  try {
    // Drop existing worker database if it exists (from previous failed run)
    await mainClient.query(`DROP DATABASE IF EXISTS ${WORKER_DB_NAME}`);

    // Create worker database from template (fast!)
    logger.debug(
      { requestId, template: TEMPLATE_DB_NAME },
      "[worker-db] Cloning from template",
    );
    await mainClient.query(
      `CREATE DATABASE ${WORKER_DB_NAME} TEMPLATE ${TEMPLATE_DB_NAME}`,
    );

    // Build worker database URL (direct connection, not via Kong/Supabase API)
    const dbUrl = MAIN_DB_URL.replace(/\/[^/]+$/, `/${WORKER_DB_NAME}`);
    workerDbUrl = dbUrl;

    // Note: Supabase API URL (via Kong) stays the same
    // PostgREST will still use the main database schema
    // We're only using per-worker databases for direct SQL connections
    const supabaseApiUrl = process.env.SUPABASE_URL || "http://127.0.0.1:54321";

    // Set environment variables for this worker
    process.env.WORKER_DB_URL = dbUrl;
    process.env.WORKER_SUPABASE_URL = supabaseApiUrl; // Keep using main Supabase URL

    logger.info(
      { requestId, workerId: WORKER_ID, dbUrl, supabaseUrl: supabaseApiUrl },
      "[worker-db] Worker database created",
    );

    return dbUrl;
  } catch (error) {
    logger.error(
      {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      },
      "[worker-db] Failed to create worker database",
    );
    throw error;
  } finally {
    await mainClient.end();
  }
}

export async function dropWorkerDatabase(): Promise<void> {
  if (!workerDbUrl) {
    return;
  }

  const requestId = crypto.randomUUID();
  logger.info(
    { requestId, workerId: WORKER_ID, dbName: WORKER_DB_NAME },
    "[worker-db] Dropping worker database",
  );

  const mainClient = new Client({ connectionString: MAIN_DB_URL });
  await mainClient.connect();

  try {
    // Force disconnect all connections to worker database
    await mainClient.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${WORKER_DB_NAME}'
        AND pid <> pg_backend_pid()
    `);

    // Drop the worker database
    await mainClient.query(`DROP DATABASE IF EXISTS ${WORKER_DB_NAME}`);

    logger.info({ requestId }, "[worker-db] Worker database dropped");
  } catch (error) {
    logger.warn(
      {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      },
      "[worker-db] Failed to drop worker database (may not exist)",
    );
  } finally {
    await mainClient.end();
  }
}

export function getWorkerDbUrl(): string {
  if (!workerDbUrl) {
    throw new Error(
      "Worker database not created. Call createWorkerDatabase() first.",
    );
  }
  return workerDbUrl;
}

// Cleanup is handled in worker-db-preload.ts via beforeExit handler
