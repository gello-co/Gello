import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config/env";

let client: SupabaseClient | null = null;

export function getSupabaseClient() {
  if (client) return client;
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      "Supabase env not configured: SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY",
    );
  }
  client = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY);
  return client;
}
