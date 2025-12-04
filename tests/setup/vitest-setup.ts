import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

/**
 * Vitest global setup.
 *
 * Responsibilities:
 * - Load Supabase env vars via `bunx supabase status -o env`
 * - Configure TLS to allow local HTTPS with self-signed certs
 * - Validate required Supabase credentials before tests run
 */

// Check if verbose logging is enabled
const VERBOSE = process.env.VERBOSE === 'true' || process.env.VERBOSE_TESTS === 'true';

// Store mkcert CA certificate for direct use in TLS configuration
let mkcertCACert: string | null = null;

function tryConfigureMkcert(): boolean {
  try {
    const mkcertCARoot = execSync('mkcert -CAROOT 2>/dev/null', {
      encoding: 'utf-8',
    })
      .toString()
      .trim();

    if (!mkcertCARoot) return false;

    const rootCAPath = `${mkcertCARoot}/rootCA.pem`;
    if (!existsSync(rootCAPath)) return false;

    mkcertCACert = readFileSync(rootCAPath, 'utf-8');
    process.env.NODE_EXTRA_CA_CERTS = rootCAPath;

    if (VERBOSE) {
      console.log(`[vitest-setup] Configured mkcert root CA: ${rootCAPath}`);
    }
    return true;
  } catch {
    return false;
  }
}

function configureTlsFallback(): void {
  const warningHandler = (warning: Error) => {
    if (warning.message.includes('NODE_TLS_REJECT_UNAUTHORIZED')) {
      return;
    }
    process.removeListener('warning', warningHandler);
    console.warn(warning);
    process.on('warning', warningHandler);
  };
  process.on('warning', warningHandler);
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  if (VERBOSE) {
    console.log('[vitest-setup] Using NODE_TLS_REJECT_UNAUTHORIZED=0 (mkcert not configured)');
  }
}

function configureLocalHttps(): void {
  const url = process.env.API_URL || process.env.SUPABASE_URL;
  const isLocalUrl = url && (url.includes('127.0.0.1') || url.includes('localhost'));

  if (!isLocalUrl) return;

  // Try mkcert first, fall back to disabling TLS verification
  if (!tryConfigureMkcert()) {
    configureTlsFallback();
  }
}

// Export function to get mkcert CA certificate
export function getMkcertCACert(): string | null {
  return mkcertCACert;
}

function validateSupabaseEnvVars(): void {
  const missing: Array<string> = [];
  const attempted: Record<string, Array<string>> = {};

  attempted.SUPABASE_URL = ['API_URL', 'SUPABASE_URL'];
  const supabaseUrl = process.env.API_URL || process.env.SUPABASE_URL;
  if (!supabaseUrl) {
    missing.push('SUPABASE_URL');
  }

  attempted.SUPABASE_SERVICE_ROLE_KEY = [
    'SERVICE_ROLE_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SECRET_KEY',
  ];
  const supabaseServiceRoleKey =
    process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SECRET_KEY;
  if (!supabaseServiceRoleKey) {
    missing.push('SUPABASE_SERVICE_ROLE_KEY');
  }

  attempted.SUPABASE_ANON_KEY = [
    'PUBLISHABLE_KEY',
    'SUPABASE_ANON_KEY',
    'ANON_KEY',
    'SUPABASE_PUBLISHABLE_KEY',
  ];
  const supabaseAnonKey =
    process.env.PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseAnonKey) {
    missing.push('SUPABASE_ANON_KEY');
  }

  if (missing.length > 0) {
    const errorMessages = missing.map((varName) => {
      const fallbacks = attempted[varName];
      if (!fallbacks) {
        return `  - ${varName}: Validation error (fallback list not found)`;
      }
      const checked = fallbacks
        .map((fb) => `${fb} (${process.env[fb] ? 'found' : 'missing'})`)
        .join(', ');
      return `  - ${varName}: Checked ${fallbacks.length} fallback(s): ${checked}`;
    });

    throw new Error(
      `Missing required Supabase environment variables:\n\n${errorMessages.join('\n')}\n\n` +
        `These variables must be loaded from 'bunx supabase status -o env'.\n` +
        `Ensure Supabase is running: bun run supabase:start\n` +
        `Then verify credentials: bunx supabase status -o env`
    );
  }
}

// Run setup synchronously at module load time
let supabaseReady = false;

// Use synchronous loading since we need env vars before tests run
try {
  const output = require('node:child_process')
    .execSync('bunx supabase status -o env 2>&1', {
      encoding: 'utf-8',
      cwd: process.cwd(),
    })
    .toString()
    .split('\n')
    .filter(
      (line: string) =>
        !(line.includes('Stopped services') || line.startsWith('WARN:')) && line.trim().length > 0
    );

  if (
    output.length > 0 &&
    output.some((line: string) => line.includes('API_URL') || line.includes('SERVICE_ROLE_KEY'))
  ) {
    for (const line of output) {
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

    if (process.env.DB_URL) {
      process.env.DATABASE_URL = process.env.DB_URL;
      process.env.SUPABASE_LOCAL_DB_URL = process.env.DB_URL;
    }

    if (process.env.API_URL) {
      const apiUrl = process.env.API_URL.replace(/^https:/, 'http:');
      process.env.SUPABASE_LOCAL_URL = apiUrl;
      process.env.SUPABASE_URL = apiUrl;
    }

    if (!process.env.AUTH_SITE_URL) {
      process.env.AUTH_SITE_URL = 'http://127.0.0.1:3000';
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

    supabaseReady = true;

    if (VERBOSE) {
      console.log(
        `[vitest-setup] Loaded Supabase env: URL=${process.env.SUPABASE_URL ? '[set]' : '[missing]'}, PUBLISHABLE_KEY=${process.env.PUBLISHABLE_KEY ? '[set]' : '[missing]'}, SECRET_KEY=${process.env.SECRET_KEY ? '[set]' : '[missing]'}`
      );
    }
  }
} catch {
  // Supabase CLI failed - will warn below
}

if (!supabaseReady) {
  console.warn('⚠️  Could not load Supabase environment variables. Supabase may not be running.');
  console.warn('   Ensure Supabase is started: bun run db:start');
}

// Only validate Supabase env vars for integration tests (not unit tests)
// Unit tests should be able to run without Supabase
const isIntegrationTest =
  process.env.VITEST_POOL_ID !== undefined &&
  (process.argv.some((arg) => arg.includes('integration')) ||
    process.env.TEST_TYPE === 'integration');

// Skip validation if explicitly disabled or running unit tests only
const skipValidation =
  process.env.SKIP_SUPABASE_VALIDATION === 'true' ||
  process.argv.some((arg) => arg.includes('tests/unit'));

if (!skipValidation && (supabaseReady || isIntegrationTest)) {
  validateSupabaseEnvVars();
}
