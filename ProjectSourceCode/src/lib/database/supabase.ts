/**
 * Supabase client initialization and environment validation
 */

/**
 * Validates that all required Supabase environment variables are set
 * Should be called at application startup
 * @throws {Error} if any required environment variables are missing or invalid
 */
export function validateSupabaseEnv(): void {
  const requiredVars = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  };

  // Check for missing variables
  for (const [name, value] of Object.entries(requiredVars)) {
    if (!value) {
      throw new Error(
        `Missing required environment variable: ${name}. ` +
          'Please check your .env file or environment configuration.'
      );
    }
  }

  // Validate URL format
  const url = requiredVars.SUPABASE_URL as string;
  if (!(url.startsWith('http://') || url.startsWith('https://'))) {
    throw new Error(`Invalid SUPABASE_URL: must start with http:// or https://. Got: ${url}`);
  }
}
