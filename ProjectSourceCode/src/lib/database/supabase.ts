/**
 * Supabase client initialization and environment validation
 */

import { env } from '../../config/env.js';

/**
 * Validates that all required Supabase environment variables are set
 * Should be called at application startup
 *
 * Uses the centralized env config which handles multiple naming conventions:
 * - SUPABASE_URL or SB_URL (Doppler)
 * - SUPABASE_PUBLISHABLE_KEY or SB_PUBLISHABLE_KEY (Doppler)
 *
 * @throws {Error} if any required environment variables are missing or invalid
 */
export function validateSupabaseEnv(): void {
  // Use the centralized env config which handles naming convention fallbacks
  const requiredVars = {
    SUPABASE_URL: env.SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: env.SUPABASE_PUBLISHABLE_KEY,
  };

  // Check for missing variables
  const missing: Array<string> = [];
  for (const [name, value] of Object.entries(requiredVars)) {
    if (!value) {
      missing.push(name);
    }
  }

  if (missing.length > 0) {
    const hints = missing.map((name) => {
      if (name === 'SUPABASE_URL') {
        return `${name} (or SB_URL via Doppler)`;
      }
      if (name === 'SUPABASE_PUBLISHABLE_KEY') {
        return `${name} (or SB_PUBLISHABLE_KEY via Doppler)`;
      }
      return name;
    });
    throw new Error(
      `Missing required environment variable(s): ${hints.join(', ')}. ` +
        'Please check your .env file or Doppler configuration.'
    );
  }

  // Validate URL format
  const url = requiredVars.SUPABASE_URL as string;
  if (!(url.startsWith('http://') || url.startsWith('https://'))) {
    throw new Error(`Invalid SUPABASE_URL: must start with http:// or https://. Got: ${url}`);
  }
}
