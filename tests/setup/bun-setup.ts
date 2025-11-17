import { execSync } from "child_process";

/**
 * Bun test global setup.
 *
 * Responsibilities:
 * - Load Supabase env vars via `bunx supabase status -o env`
 * - Configure TLS to allow local HTTPS with self-signed certs
 * - Validate required Supabase credentials before tests run
 */

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 2000;
const RETRY_DELAY_MULTIPLIER = 1.5;

const sleepBuffer = new SharedArrayBuffer(4);
const sleepArray = new Int32Array(sleepBuffer);

function sleepSync(ms: number): void {
  Atomics.wait(sleepArray, 0, 0, ms);
}

function configureLocalHttps(): void {
  const url = process.env.API_URL || process.env.SUPABASE_URL;
  if (url && (url.includes("127.0.0.1") || url.includes("localhost"))) {
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
  if (process.env.API_URL) {
    process.env.SUPABASE_LOCAL_URL = process.env.API_URL;
    process.env.SUPABASE_URL = process.env.API_URL;
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

  console.log(
    `[bun-setup] Loaded Supabase env: URL=${process.env.SUPABASE_URL ? "[set]" : "[missing]"}, PUBLISHABLE_KEY=${process.env.PUBLISHABLE_KEY ? "[set]" : "[missing]"}, SECRET_KEY=${process.env.SECRET_KEY ? "[set]" : "[missing]"}`,
  );
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
