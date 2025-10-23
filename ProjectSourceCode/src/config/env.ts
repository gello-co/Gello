export type AppEnv = {
	NODE_ENV: string | undefined;
	PORT: string | undefined;
	SUPABASE_URL?: string;
	SUPABASE_PUBLISHABLE_KEY?: string;
	SUPABASE_SERVICE_ROLE_KEY?: string;
};

// Resolve env with flexible fallbacks to support different providers
// and naming restrictions (e.g., reserved prefixes in Supabase).
function pick(...candidates: Array<string | undefined>) {
	for (const v of candidates) if (v && v.length > 0) return v;
	return undefined;
}

export const env: AppEnv = {
	NODE_ENV: process.env.NODE_ENV,
	PORT: process.env.PORT,
	// URL fallbacks: prefer explicit app/client names before reserved ones
	SUPABASE_URL: pick(
		process.env.SUPABASE_URL,
		process.env.APP_SUPABASE_URL,
		process.env.SB_URL,
		process.env.PUBLIC_SUPABASE_URL,
		process.env.BUN_PUBLIC_SUPABASE_URL,
	),
	// Publishable (formerly anon) fallbacks
	SUPABASE_PUBLISHABLE_KEY: pick(
		process.env.SUPABASE_PUBLISHABLE_KEY,
		process.env.SUPABASE_ANON_KEY,
		process.env.APP_SUPABASE_PUBLISHABLE_KEY,
		process.env.SB_PUBLISHABLE_KEY,
		process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
		process.env.BUN_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
	),
	// Service role fallbacks (server-only)
	SUPABASE_SERVICE_ROLE_KEY: pick(
		process.env.SUPABASE_SERVICE_ROLE_KEY,
		process.env.APP_SUPABASE_SERVICE_ROLE_KEY,
		process.env.SB_SERVICE_ROLE_KEY,
		process.env.SERVICE_ROLE_KEY,
	),
};
