import "server-only";

/**
 * Server-side environment access. Nothing here may be imported from a Client
 * Component — the `server-only` guard turns a mistake into a build error.
 */

function optional(name: string): string | null {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : null;
}

export const serverEnv = {
  supabaseUrl: optional("SUPABASE_URL") ?? optional("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseKey: optional("SUPABASE_SECRET_KEY") ?? optional("SUPABASE_SERVICE_ROLE_KEY"),
  supabaseSchema: optional("SUPABASE_DB_SCHEMA") ?? "tripsync",
  googleMapsServerKey: optional("GOOGLE_MAPS_SERVER_KEY"),
  duffelToken: optional("DUFFEL_ACCESS_TOKEN"),
  amadeusClientId: optional("AMADEUS_CLIENT_ID"),
  amadeusClientSecret: optional("AMADEUS_CLIENT_SECRET"),
  holidayBaseUrl: optional("HOLIDAY_API_BASE_URL") ?? "https://date.nager.at/api/v3",
  anthropicKey: optional("ANTHROPIC_API_KEY"),
  anthropicModel: optional("ANTHROPIC_MODEL") ?? "claude-sonnet-5",
} as const;

/**
 * Demo mode is opt-in, not the default. Without any keys the app now uses free,
 * keyless OpenStreetMap services and returns real data, so falling back to
 * generated samples should be a deliberate choice.
 */
export const demoModeRequested = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export function hasDatabase(): boolean {
  return Boolean(serverEnv.supabaseUrl && serverEnv.supabaseKey);
}

export function siteUrl(): string {
  const explicit = optional("NEXT_PUBLIC_SITE_URL");
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = optional("VERCEL_PROJECT_PRODUCTION_URL") ?? optional("VERCEL_URL");
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
