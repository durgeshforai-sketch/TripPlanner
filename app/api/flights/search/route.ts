import { z } from "zod";
import { handle, ok } from "@/lib/api";
import { requireMembership } from "@/lib/auth/session";
import { flightsMode, getFlightProvider } from "@/lib/providers";

const querySchema = z.object({
  tripId: z.string().uuid(),
  origin: z.string().trim().length(3),
  destination: z.string().trim().length(3),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  passengers: z.coerce.number().int().min(1).max(9).default(1),
});

/**
 * Trip-scoped and session-gated: flight search is the most expensive call in the
 * product, so it is never reachable without a valid membership.
 */
export async function GET(request: Request) {
  return handle(async () => {
    const url = new URL(request.url);
    const input = querySchema.parse(Object.fromEntries(url.searchParams));
    await requireMembership(input.tripId);

    const offers = await getFlightProvider().searchFlights({
      originAirport: input.origin.toUpperCase(),
      destinationAirport: input.destination.toUpperCase(),
      departureDate: input.departureDate,
      returnDate: input.returnDate,
      passengers: input.passengers,
      maxConnections: 1,
    });

    return ok({
      offers,
      source: flightsMode(),
      checkedAt: new Date().toISOString(),
    });
  });
}
