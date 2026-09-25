import { z } from "zod";
import { handle, ok } from "@/lib/api";
import { notFound } from "@/lib/errors";
import { requireMembership } from "@/lib/auth/session";
import { getRouteProvider, routesMode } from "@/lib/providers";
import { getDestination } from "@/data/destinations";
import { haversineKm } from "@/lib/providers/googleRoutes";

const querySchema = z.object({
  tripId: z.string().uuid(),
  destinationId: z.string().trim().min(1).max(80),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

/**
 * Road distance and time for one origin. Falls back to a straight-line distance
 * marked as an estimate rather than failing the page.
 */
export async function GET(request: Request) {
  return handle(async () => {
    const url = new URL(request.url);
    const input = querySchema.parse(Object.fromEntries(url.searchParams));
    await requireMembership(input.tripId);

    const destination = getDestination(input.destinationId);
    if (!destination) throw notFound("We do not have that destination.");

    const origin = { latitude: input.latitude, longitude: input.longitude };
    try {
      const leg = await getRouteProvider().drive(origin, destination);
      if (leg) return ok({ route: leg, source: routesMode(), estimated: routesMode() === "demo" });
    } catch (error) {
      console.warn("[routes] falling back to straight-line distance", error);
    }

    return ok({
      route: { distanceKm: haversineKm(origin, destination), durationMinutes: null },
      source: "estimated",
      estimated: true,
    });
  });
}
