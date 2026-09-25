import "server-only";
import { z } from "zod";
import { fetchJson, ProviderError } from "@/lib/http";
import { serverEnv } from "@/lib/env";
import type { RouteLeg, RouteProvider } from "./types";

const routeSchema = z.object({
  routes: z
    .array(z.object({ distanceMeters: z.number().optional(), duration: z.string().optional() }))
    .optional()
    .default([]),
});

export class GoogleRoutesProvider implements RouteProvider {
  readonly source = "google-routes" as const;

  async drive(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
  ): Promise<RouteLeg | null> {
    const apiKey = serverEnv.googleMapsServerKey;
    if (!apiKey) throw new ProviderError("google-routes", "Google Routes is not configured");

    const raw = await fetchJson("https://routes.googleapis.com/directions/v2:computeRoutes", {
      provider: "google-routes",
      method: "POST",
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
      },
      body: {
        origin: { location: { latLng: origin } },
        destination: { location: { latLng: destination } },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
      },
      timeoutMs: 6000,
      retries: 1,
      next: { revalidate: 60 * 60 * 24 * 7 },
    });

    const route = routeSchema.parse(raw).routes[0];
    if (!route?.distanceMeters || !route.duration) return null;
    const seconds = Number.parseInt(route.duration.replace(/s$/, ""), 10);
    if (Number.isNaN(seconds)) return null;
    return {
      distanceKm: Math.round(route.distanceMeters / 1000),
      durationMinutes: Math.round(seconds / 60),
    };
  }
}

/** Great-circle distance, used when a road route is not meaningful or available. */
export function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}
