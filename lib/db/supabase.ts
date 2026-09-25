import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/** The schema the generated `Database` types describe. */
const APP_SCHEMA = "tripsync";

export type AppClient = SupabaseClient<Database, typeof APP_SCHEMA>;

let cached: AppClient | null = null;

export class DatabaseUnavailableError extends Error {
  constructor() {
    super("Database is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY.");
    this.name = "DatabaseUnavailableError";
  }
}

/**
 * Service-key client. It bypasses RLS, so it must only be reached from server
 * code that has already authorised the caller.
 */
export function db(): AppClient {
  if (cached) return cached;
  const { supabaseUrl, supabaseKey, supabaseSchema } = serverEnv;
  if (!supabaseUrl || !supabaseKey) throw new DatabaseUnavailableError();

  // The generated types cover one schema; an env override is assumed to be a
  // structurally identical schema (e.g. a staging copy).
  const schema = (supabaseSchema || APP_SCHEMA) as typeof APP_SCHEMA;

  cached = createClient<Database, typeof APP_SCHEMA>(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema },
    global: { headers: { "x-application-name": "tripsync" } },
  });
  return cached;
}
