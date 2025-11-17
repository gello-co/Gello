/**
 * Vitest setup file to load local Supabase environment variables
 *
 * This file runs before tests and populates process.env with Supabase credentials
 * from 'supabase status -o env'. Test code reads from process.env at runtime.
 *
 * IMPORTANT: Do not duplicate fallback logic in vitest.config.ts - this file
 * handles all environment variable loading. The config's env section only passes
 * through pre-existing variables (e.g., from CI or shell exports).
 *
 * Developers can override by exporting variables before running tests:
 *   export SUPABASE_URL=http://localhost:54321 && bun run test:integration
 * Or use Doppler for secrets injection:
 *   doppler run -- bun run test:integration
 */

import { execSync } from "child_process";

// Load environment variables from supabase status
// Wait for Supabase to be ready (retry up to 3 times with non-blocking delays)
// Using Atomics.wait instead of busy-wait to reduce CPU load during CI startup
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 2000; // Start with 2s delay
const RETRY_DELAY_MULTIPLIER = 1.5; // Exponential backoff: 2s, 3s, 4.5s

// Create SharedArrayBuffer and Int32Array for Atomics.wait
// Atomics.wait allows the thread to yield CPU time instead of busy-waiting
const sleepBuffer = new SharedArrayBuffer(4);
const sleepArray = new Int32Array(sleepBuffer);

/**
 * Synchronous sleep using Atomics.wait (non-blocking, lower CPU than busy-wait)
 * Atomics.wait allows the thread to yield CPU time while waiting
 * @param ms - Milliseconds to sleep
 */
function sleepSync(ms: number): void {
  // Atomics.wait waits on the value at index 0, expecting it to be 0
  // It will wait up to ms milliseconds, then return "timed-out"
  // This is more efficient than busy-waiting as it allows the thread to yield
  Atomics.wait(sleepArray, 0, 0, ms);
}

/**
 * Configure environment to accept self-signed certificates for local HTTPS
 * This allows the Supabase client to connect to local Supabase instances
 * using HTTPS with self-signed certificates
 */
function configureLocalHttps(): void {
  // For localhost HTTPS with self-signed certificates, allow insecure connections
  // This is safe for local development only (tests run against local Supabase)
  const url = process.env.API_URL || process.env.SUPABASE_URL;
  if (url && (url.includes("127.0.0.1") || url.includes("localhost"))) {
    // Bun/Node.js: Allow self-signed certificates for localhost
    // Suppress the warning since this is intentional for local development
    // The warning is expected and safe for localhost-only connections
    // Set up warning handler BEFORE setting the env var to catch the warning
    const warningHandler = (warning: Error) => {
      if (warning.message.includes("NODE_TLS_REJECT_UNAUTHORIZED")) {
        // Suppress this specific warning - it's expected for local development
        return;
      }
      // Emit other warnings normally (remove our handler first to avoid recursion)
      process.removeListener("warning", warningHandler);
      console.warn(warning);
      process.on("warning", warningHandler);
    };
    process.on("warning", warningHandler);
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }
}

let envOutput: string[] = [];
let supabaseReady = false;
for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
  try {
    const output = execSync("bunx supabase status -o env 2>&1", {
      encoding: "utf-8",
      cwd: process.cwd(),
    })
      .toString()
      .split("\n")
      .filter(
        (line) => !line.includes("Stopped services") && line.trim().length > 0,
      );

    // Check if we got valid environment variables
    if (
      output.length > 0 &&
      output.some(
        (line) => line.includes("API_URL") || line.includes("SERVICE_ROLE_KEY"),
      )
    ) {
      envOutput = output;
      supabaseReady = true;
      break;
    }
  } catch (error) {
    // Supabase may not be ready yet - wait synchronously with exponential backoff
    if (attempt < MAX_RETRIES - 1) {
      const sleepMs = Math.floor(
        INITIAL_RETRY_DELAY_MS * Math.pow(RETRY_DELAY_MULTIPLIER, attempt),
      );
      sleepSync(sleepMs);
      continue;
    }
  }
}

if (supabaseReady) {
  for (const line of envOutput) {
    // Handle both KEY="value" and KEY=value formats
    const match = line.match(/^([A-Z_]+)=(?:"([^"]+)"|([^" \n]+))$/);
    if (match) {
      const [, key, quotedValue, unquotedValue] = match;
      const value = quotedValue || unquotedValue;
      if (key && value) {
        // Force set (don't check if already exists) to ensure we use local values
        process.env[key] = value;
      }
    }
  }

  // Map API key format to expected environment variable names
  // Prioritize JWT format (SERVICE_ROLE_KEY) over new format (SECRET_KEY) for service role
  // NOTE: Supabase JS client requires JWT format for service role operations
  // See: https://github.com/supabase/supabase/issues/37648
  if (process.env.PUBLISHABLE_KEY) {
    process.env.SUPABASE_LOCAL_ANON_KEY = process.env.PUBLISHABLE_KEY;
    process.env.SUPABASE_PUBLISHABLE_KEY = process.env.PUBLISHABLE_KEY;
  }
  if (process.env.API_URL) {
    // Keep HTTPS URLs as-is - configure TLS to accept self-signed certificates
    process.env.SUPABASE_LOCAL_URL = process.env.API_URL;
    process.env.SUPABASE_URL = process.env.API_URL;
  }

  // Configure environment to accept self-signed certificates for local HTTPS
  configureLocalHttps();

  // Prioritize JWT format (SERVICE_ROLE_KEY) for service role operations
  // Only use SECRET_KEY (new format) as fallback if SERVICE_ROLE_KEY not available
  if (process.env.SERVICE_ROLE_KEY) {
    // JWT format - use this for service role operations
    process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY;
  } else if (process.env.SECRET_KEY) {
    // New format - fallback only (may not work for all service role operations)
    process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY = process.env.SECRET_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SECRET_KEY;
  }

  // Fallback to legacy format if new format not available
  if (!process.env.SUPABASE_LOCAL_ANON_KEY && process.env.ANON_KEY) {
    process.env.SUPABASE_LOCAL_ANON_KEY = process.env.ANON_KEY;
    process.env.SUPABASE_PUBLISHABLE_KEY = process.env.ANON_KEY;
  }

  // Debug: log what we set (truncated for security)
  console.log(
    `[vitest-setup] Loaded Supabase env: URL=${process.env.SUPABASE_URL}, PUBLISHABLE_KEY=${process.env.PUBLISHABLE_KEY?.substring(0, 20)}..., SECRET_KEY=${process.env.SECRET_KEY?.substring(0, 20)}...`,
  );
} else {
  // If supabase is not ready after retries
  console.warn(
    "⚠️  Could not load Supabase environment variables from 'supabase status' after retries. Supabase may not be running or ready.",
  );
  console.warn("   Ensure Supabase is started: bun run supabase:start");
}

/**
 * Validates required Supabase environment variables using the same fallback order as vitest.config.ts
 * Throws clear, descriptive errors if any required variables are missing
 */
function validateSupabaseEnvVars(): void {
  const missing: string[] = [];
  const attempted: Record<string, string[]> = {};

  // Validate SUPABASE_URL (matches vitest.config.ts fallback order)
  attempted.SUPABASE_URL = ["API_URL", "SUPABASE_URL"];
  const supabaseUrl =
    process.env.API_URL || // New format from supabase status -o env
    process.env.SUPABASE_URL;
  if (!supabaseUrl) {
    missing.push("SUPABASE_URL");
  }

  // Validate SUPABASE_SERVICE_ROLE_KEY (matches vitest.config.ts fallback order)
  attempted.SUPABASE_SERVICE_ROLE_KEY = [
    "SERVICE_ROLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SECRET_KEY",
  ];
  const supabaseServiceRoleKey =
    process.env.SERVICE_ROLE_KEY || // Legacy format (JWT) - REQUIRED
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SECRET_KEY; // New format (sb_secret_...) - fallback only
  if (!supabaseServiceRoleKey) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  // Validate SUPABASE_ANON_KEY (matches vitest.config.ts fallback order)
  attempted.SUPABASE_ANON_KEY = [
    "PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
    "ANON_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
  ];
  const supabaseAnonKey =
    process.env.PUBLISHABLE_KEY || // New format (sb_publishable_...)
    process.env.SUPABASE_ANON_KEY ||
    process.env.ANON_KEY || // Legacy format (JWT)
    process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseAnonKey) {
    missing.push("SUPABASE_ANON_KEY");
  }

  // Throw descriptive error if any variables are missing
  if (missing.length > 0) {
    const errorMessages = missing.map((varName) => {
      const fallbacks = attempted[varName];
      if (!fallbacks) {
        return `  - ${varName}: Validation error (fallback list not found)`;
      }
      const checked = fallbacks
        .map((fb) => `${fb} (${process.env[fb] ? "found" : "missing"})`)
        .join(", ");
      return `  - ${varName}: Checked ${fallbacks.length} fallback(s): ${checked}`;
    });

    throw new Error(
      `Missing required Supabase environment variables:\n\n${errorMessages.join("\n")}\n\n` +
        `These variables must be loaded from 'supabase status -o env' via vitest-setup.ts.\n` +
        `Ensure Supabase is running: bun run supabase:start\n` +
        `Then verify credentials are loaded: bunx supabase status -o env`,
    );
  }
}

// Validate environment variables before tests run
// This ensures tests fail fast with clear error messages
validateSupabaseEnvVars();
