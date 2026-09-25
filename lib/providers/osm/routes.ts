import "server-only";
import { z } from "zod";
import { fetchJson } from "@/lib/http";
import type { RouteLeg, RouteProvider } from "../types";
import { OSM_USER_AGENT } from "./places";

const osrmSchema = z.object({
  code: z.string(),
  routes: z
    .array(z.object({ distance: z.number(), duration: z.number() }))
    .default([]),
});

/**
 * Free road routing from the public OSRM demo server. No key, no quota beyond
 * fair use. Results are cached for a week because road geometry barely moves.
 */
export class OsrmRouteProvider implements RouteProvider {
  readonly source = "osrm" as const;

  async drive(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
  ): Promise<RouteLeg | null> {
    const path = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
    const raw = await fetchJson(
      `https://router.project-osrm.org/route/v1/driving/${path}?overview=false&alternatives=false`,
      {
        provider: "osrm",
        headers: { "User-Agent": OSM_USER_AGENT },
        timeoutMs: 9000,
        retries: 1,
        next: { revalidate: 60 * 60 * 24 * 7 },
      },
    );

    const parsed = osrmSchema.parse(raw);
    const route = parsed.routes[0];
    // "NoRoute" is a real answer — islands and cross-sea pairs have no road.
    if (parsed.code !== "Ok" || !route) return null;

    return {
      distanceKm: Math.round(route.distance / 1000),
      durationMinutes: Math.round(route.duration / 60),
    };
  }
}
