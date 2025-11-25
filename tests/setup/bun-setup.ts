import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

/**
 * Bun test global setup.
 *
 * Responsibilities:
 * - Load Supabase env vars via `bunx supabase status -o env`
 * - Configure TLS to allow local HTTPS with self-signed certs
 * - Validate required Supabase credentials before tests run
 */

// Check if verbose logging is enabled
const VERBOSE =
  process.env.VERBOSE === "true" || process.env.VERBOSE_TESTS === "true";

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 2000;
const RETRY_DELAY_MULTIPLIER = 1.5;

const sleepBuffer = new SharedArrayBuffer(4);
const sleepArray = new Int32Array(sleepBuffer);

function sleepSync(ms: number): void {
  Atomics.wait(sleepArray, 0, 0, ms);
}

// Store mkcert CA certificate for direct use in Bun's TLS configuration
// Bun's fetch TLS options don't fully respect NODE_EXTRA_CA_CERTS, so we load it directly
let mkcertCACert: string | null = null;

function configureLocalHttps(): void {
  const url = process.env.API_URL || process.env.SUPABASE_URL;
  if (url && (url.includes("127.0.0.1") || url.includes("localhost"))) {
    // Try to use mkcert root CA for proper certificate trust
    // Load the CA certificate directly for Bun's TLS configuration
    try {
      const mkcertCARoot = execSync("mkcert -CAROOT 2>/dev/null", {
        encoding: "utf-8",
      })
        .toString()
        .trim();
      if (mkcertCARoot) {
        const rootCAPath = `${mkcertCARoot}/rootCA.pem`;
        // Check if root CA file exists
        if (existsSync(rootCAPath)) {
          // Read CA certificate for direct use in Bun's TLS options
          mkcertCACert = readFileSync(rootCAPath, "utf-8");

          // Also set NODE_EXTRA_CA_CERTS for Node.js compatibility
          process.env.NODE_EXTRA_CA_CERTS = rootCAPath;

          if (VERBOSE) {
            console.log(
              `[bun-setup] Configured mkcert root CA: ${rootCAPath} (loaded for Bun TLS)`,
            );
          }
          return;
        }
      }
    } catch {
      // mkcert not available or CAROOT not found - fall back to disabling verification
    }

    // Fallback: Disable certificate verification for localhost (less secure but works)
    // This is used when mkcert is not available or not configured
    const warningHandler = (warning: Error) => {
      if (warning.message.includes("NODE_TLS_REJECT_UNAUTHORIZED")) {
        return;
      }
      process.removeListener("warning", warningHandler);
      console.warn(warning);
      process.on("warning", warningHandler);
    };
    process.on("warning", warningHandler);
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    if (VERBOSE) {
      console.log(
        "[bun-setup] Using NODE_TLS_REJECT_UNAUTHORIZED=0 (mkcert not configured)",
      );
    }
  }
}

// Export function to get mkcert CA certificate for use in fetch TLS configuration
export function getMkcertCACert(): string | null {
  return mkcertCACert;
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
  } catch {
    if (attempt < MAX_RETRIES - 1) {
      const sleepMs = Math.floor(
        INITIAL_RETRY_DELAY_MS * RETRY_DELAY_MULTIPLIER ** attempt,
      );
      sleepSync(sleepMs);
    }
  }
}

if (supabaseReady) {
  for (const line of envOutput) {
    const match = line.match(/^([A-Z_]+)=(?:"([^"]+)"|([^" \n]+))$/);
    if (match) {
      const [, key, quotedValue, unquotedValue] = match;
      const value = quotedValue || unquotedValue;
      if (key && value) {
        process.env[key] = value;
      }
    }
  }

  if (process.env.PUBLISHABLE_KEY) {
    process.env.SUPABASE_LOCAL_ANON_KEY = process.env.PUBLISHABLE_KEY;
    process.env.SUPABASE_PUBLISHABLE_KEY = process.env.PUBLISHABLE_KEY;
  }
  // Map DB_URL to DATABASE_URL (legacy compatibility)
  // Supabase CLI outputs DB_URL
  if (process.env.DB_URL) {
    process.env.DATABASE_URL = process.env.DB_URL;
    process.env.SUPABASE_LOCAL_DB_URL = process.env.DB_URL;
  }
  if (process.env.API_URL) {
    // Convert HTTPS to HTTP for local development (TLS disabled in config.toml)
    // This avoids WSL2/Docker TLS handshake issues
    const apiUrl = process.env.API_URL.replace(/^https:/, "http:");
    process.env.SUPABASE_LOCAL_URL = apiUrl;
    process.env.SUPABASE_URL = apiUrl;
  }

  // Set AUTH_SITE_URL for Supabase Auth (required for local development)
  // Use HTTP to match the API URL configuration
  if (!process.env.AUTH_SITE_URL) {
    process.env.AUTH_SITE_URL = "http://127.0.0.1:3000";
  }

  configureLocalHttps();

  if (process.env.SERVICE_ROLE_KEY) {
    process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY;
  } else if (process.env.SECRET_KEY) {
    process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY = process.env.SECRET_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SECRET_KEY;
  }

  if (!process.env.SUPABASE_LOCAL_ANON_KEY && process.env.ANON_KEY) {
    process.env.SUPABASE_LOCAL_ANON_KEY = process.env.ANON_KEY;
    process.env.SUPABASE_PUBLISHABLE_KEY = process.env.ANON_KEY;
  }

  if (VERBOSE) {
    console.log(
      `[bun-setup] Loaded Supabase env: URL=${process.env.SUPABASE_URL ? "[set]" : "[missing]"}, PUBLISHABLE_KEY=${process.env.PUBLISHABLE_KEY ? "[set]" : "[missing]"}, SECRET_KEY=${process.env.SECRET_KEY ? "[set]" : "[missing]"}`,
    );
  }
} else {
  console.warn(
    "⚠️  Could not load Supabase environment variables from 'bunx supabase status -o env' after retries. Supabase may not be running.",
  );
  console.warn("   Ensure Supabase is started: bun run supabase:start");
}

function validateSupabaseEnvVars(): void {
  const missing: string[] = [];
  const attempted: Record<string, string[]> = {};

  attempted.SUPABASE_URL = ["API_URL", "SUPABASE_URL"];
  const supabaseUrl = process.env.API_URL || process.env.SUPABASE_URL;
  if (!supabaseUrl) {
    missing.push("SUPABASE_URL");
  }

  attempted.SUPABASE_SERVICE_ROLE_KEY = [
    "SERVICE_ROLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SECRET_KEY",
  ];
  const supabaseServiceRoleKey =
    process.env.SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SECRET_KEY;
  if (!supabaseServiceRoleKey) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  attempted.SUPABASE_ANON_KEY = [
    "PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
    "ANON_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
  ];
  const supabaseAnonKey =
    process.env.PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseAnonKey) {
    missing.push("SUPABASE_ANON_KEY");
  }

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
        `These variables must be loaded from 'bunx supabase status -o env'.\n` +
        `Ensure Supabase is running: bun run supabase:start\n` +
        `Then verify credentials: bunx supabase status -o env`,
    );
  }
}

validateSupabaseEnvVars();

// Note: Database seeding is handled automatically by Supabase CLI via seed.sql
// during `supabase db reset`. No programmatic seeding needed.
