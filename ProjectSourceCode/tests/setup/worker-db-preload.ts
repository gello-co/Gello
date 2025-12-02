/**
 * Bun test preload: Setup per-worker database before tests run
 * This runs once per worker process
 */

import { ensureTemplateExists } from "./ensure-template.js";
import { createWorkerDatabase, dropWorkerDatabase } from "./worker-db.js";

// Create worker database when this module loads (once per worker)
let setupComplete = false;

async function setup() {
  if (setupComplete) return;

  try {
    // Step 1: Ensure template database exists (creates it automatically if needed)
    // Only first worker will create it, others wait for completion
    console.log(`[worker-${process.pid}] Ensuring template database exists...`);
    await ensureTemplateExists();

    // Step 2: Create this worker's database from template
    console.log(`[worker-${process.pid}] Setting up worker database...`);
    const workerDbUrl = await createWorkerDatabase();

    // Set environment variable for this worker
    process.env.WORKER_DB_URL = workerDbUrl;

    console.log(
      `[worker-${process.pid}] Worker database ready: ${workerDbUrl}`,
    );
    setupComplete = true;
  } catch (error) {
    console.error(
      `[worker-${process.pid}] Failed to setup worker database:`,
      error,
    );
    process.exit(1);
  }
}

// Run setup immediately
await setup();

// Register cleanup handler
process.on("beforeExit", async () => {
  console.log(`[worker-${process.pid}] Cleaning up worker database...`);
  await dropWorkerDatabase();
});
