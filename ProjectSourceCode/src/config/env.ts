export type AppEnv = {
  NODE_ENV: string | undefined;
  PORT: string | undefined;
  DEV_BYPASS_AUTH?: string;
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

function pick(...candidates: Array<string | undefined>) {
  for (const v of candidates) if (v && v.length > 0) return v;
  return undefined;
}

export const env: AppEnv = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DEV_BYPASS_AUTH: process.env.DEV_BYPASS_AUTH,
  SUPABASE_URL: pick(
    // Local Supabase (for testing) takes priority
    process.env.SUPABASE_LOCAL_URL,
    process.env.SUPABASE_URL,
    // Production/remote Supabase
    process.env.APP_SUPABASE_URL,
    process.env.BUN_PUBLIC_SUPABASE_URL,
    process.env.SB_URL,
    process.env.PUBLIC_SUPABASE_URL,
  ),
  SUPABASE_PUBLISHABLE_KEY: pick(
    // Local Supabase (for testing) takes priority
    // New API key format (sb_publishable_...) from supabase status -o env
    process.env.PUBLISHABLE_KEY,
    process.env.SUPABASE_LOCAL_ANON_KEY,
    // Legacy format (JWT) from supabase status -o env
    process.env.ANON_KEY,
    process.env.SUPABASE_ANON_KEY,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    // Production/remote Supabase
    process.env.APP_SUPABASE_PUBLISHABLE_KEY,
    process.env.BUN_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.SB_PUBLISHABLE_KEY,
    process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ),
  SUPABASE_SERVICE_ROLE_KEY: pick(
    // Local Supabase (for testing) takes priority
    // Legacy format (JWT) from supabase status -o env (REQUIRED for service role operations)
    // NOTE: Supabase JS client requires JWT format for service role operations
    // New API key format (sb_secret_...) does not work for admin operations
    process.env.SERVICE_ROLE_KEY,
    process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    // New API key format (sb_secret_...) - fallback only (may not work)
    process.env.SECRET_KEY,
    // Production/remote Supabase
    process.env.APP_SUPABASE_SERVICE_ROLE_KEY,
    process.env.SB_SERVICE_ROLE_KEY,
  ),
};
