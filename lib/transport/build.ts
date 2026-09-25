import "server-only";
import { mapWithConcurrency } from "@/lib/http";
import { getRouteProvider, routesMode } from "@/lib/providers";
import { haversineKm } from "@/lib/providers/googleRoutes";
import { FLIGHT_ESTIMATE, PLANNING } from "@/lib/recommendation/config";
import type { ResolvedOrigin } from "@/lib/recommendation/travel";
import {
  busOption,
  driveOption,
  estimateAirfare,
  flightOption,
  isRoadFirst,
  recommendMode,
  shouldOfferFlight,
  trainOption,
} from "./model";
import type { Destination } from "@/types/destination";
import type { FlightSummary } from "@/types/flight";
import type { OriginTransport, TransportOption, TransportSummary } from "@/types/transport";

/**
 * Works out how each origin would actually get to a destination.
 *
 * Road options are always computed when a road route exists, because a 200 km
 * hop should never be presented as a flight. Where a live flight price is
 * available it replaces the estimate for the flying option.
 */
export async function buildTransportSummary(input: {
  destination: Destination;
  origins: ResolvedOrigin[];
  flights: FlightSummary | null;
  /** How many people share a car from each origin. */
  partySizeByCity: Map<string, number>;
  allowedModes?: TransportOption["mode"][];
}): Promise<TransportSummary> {
  const { destination, origins, flights, partySizeByCity, allowedModes } = input;
  const provider = getRouteProvider();
  const demoRoutes = routesMode() === "demo";

  const flightByCity = new Map(
    (flights?.perOrigin ?? []).map((entry) => [entry.originCity, entry.cheapest]),
  );

  const settled = await mapWithConcurrency(
    origins.slice(0, PLANNING.maxFlightOrigins),
    2,
    async (origin): Promise<OriginTransport | null> => {
      const from =
        origin.latitude !== null && origin.longitude !== null
          ? { latitude: origin.latitude, longitude: origin.longitude }
          : origin.airport;
      if (!from) return null;

      const straightLineKm = haversineKm(from, destination);

      // A road route is the thing that decides whether road travel is even an
      // option — islands and cross-sea destinations simply have none.
      let roadKm: number | null = null;
      let roadMinutes: number | null = null;
      try {
        const leg = await provider.drive(from, destination);
        if (leg) {
          roadKm = leg.distanceKm;
          roadMinutes = leg.durationMinutes;
        }
      } catch (error) {
        console.warn(`[transport] no road route for ${origin.city}`, error);
      }

      // Without a routing answer, assume road travel is out rather than
      // inventing a road across water.
      const options: TransportOption[] = [];

      if (roadKm !== null) {
        const occupancy = Math.max(1, Math.min(4, partySizeByCity.get(origin.city) ?? 4));
        const drive = driveOption(roadKm, occupancy);
        // Prefer a real routed duration over the model's average speed.
        options.push(
          roadMinutes !== null && !demoRoutes
            ? {
                ...drive,
                durationHours: Number((roadMinutes / 60 + 0.75).toFixed(1)),
              }
            : drive,
        );
        options.push(trainOption(roadKm));
        options.push(busOption(roadKm));
      }

      const live = flightByCity.get(origin.city);

      if (shouldOfferFlight(origin.airport?.code ?? null, destination.airportCodes)) {
        const international =
          (origin.airport?.countryCode ?? "IN").toUpperCase() !==
          destination.countryCode.toUpperCase();

        const fare =
          live && live.currency === "INR"
            ? live.price
            : estimateAirfare({ straightLineKm, international, rates: FLIGHT_ESTIMATE });

        options.push(
          flightOption({
            straightLineKm,
            roadKm,
            costPerPerson: fare,
            costBasis: live ? "live" : "estimated",
            flyingMinutes: live?.durationMinutes ?? null,
          }),
        );
      }

      return {
        originCity: origin.city,
        memberIds: origin.memberIds,
        distanceKm: roadKm ?? straightLineKm,
        roadDistanceKm: roadKm,
        options,
        recommended: recommendMode(options, roadKm, allowedModes),
        roadFirst: isRoadFirst(roadKm),
      };
    },
  );

  const perOrigin: OriginTransport[] = [];
  for (const result of settled) {
    if (result.status === "fulfilled" && result.value) perOrigin.push(result.value);
    else if (result.status === "rejected") console.warn("[transport] origin failed", result.reason);
  }

  // Headline cost uses the mode we would actually suggest for each origin.
  const costs = perOrigin
    .map((entry) => entry.options.find((option) => option.mode === entry.recommended))
    .filter((option): option is TransportOption => option !== undefined)
    .map((option) => option.costPerPerson);

  return {
    perOrigin,
    minCostPerPerson: costs.length ? Math.min(...costs) : null,
    maxCostPerPerson: costs.length ? Math.max(...costs) : null,
    averageCostPerPerson: costs.length
      ? Math.round(costs.reduce((a, b) => a + b, 0) / costs.length)
      : null,
    anyRoadFirst: perOrigin.some((entry) => entry.roadFirst),
    checkedAt: new Date().toISOString(),
  };
}
