/**
 * Vitest setup file to load local Supabase environment variables
 * This ensures the app code has access to Supabase credentials during tests
 */

import { execSync } from "child_process";

// Load environment variables from supabase status
// Wait for Supabase to be ready (retry up to 5 times with synchronous delays)
let envOutput: string[] = [];
let supabaseReady = false;
for (let attempt = 0; attempt < 5; attempt++) {
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
    if (output.length > 0 && output.some((line) => line.includes("API_URL") || line.includes("SERVICE_ROLE_KEY"))) {
      envOutput = output;
      supabaseReady = true;
      break;
    }
  } catch (error) {
    // Supabase may not be ready yet - wait synchronously
    if (attempt < 4) {
      // Use synchronous sleep (blocking, but necessary for setup file)
      const sleepMs = 1000 * (attempt + 1);
      const start = Date.now();
      while (Date.now() - start < sleepMs) {
        // Busy wait (synchronous)
      }
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
    process.env.SUPABASE_LOCAL_URL = process.env.API_URL;
    process.env.SUPABASE_URL = process.env.API_URL;
  }

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
  console.warn(
    "   Ensure Supabase is started: bun run supabase:start",
  );
}
