import "server-only";
import { getAirport } from "@/data/airports";
import { mapWithConcurrency } from "@/lib/http";
import { getActivityProvider, getFlightProvider, getRouteProvider, flightsMode, activitiesMode, routesMode } from "@/lib/providers";
import { PLANNING, STYLE_TO_CATEGORY } from "./config";
import { estimateTravel, type ResolvedOrigin } from "./travel";
import type { Activity, ActivityCategory } from "@/types/activity";
import type { Destination } from "@/types/destination";
import type { FlightSummary, OriginFlightSummary } from "@/types/flight";
import type { DateRange, TripStyle } from "@/types/preferences";
import type { TravelSummary } from "@/types/recommendation";

/**
 * Flight lookups for one destination.
 *
 * Origins are already de-duplicated, capped and run with bounded concurrency,
 * and every lookup is settled independently so one failing origin does not lose
 * the others — or the recommendation.
 */
export async function loadFlights(
  destination: Destination,
  origins: ResolvedOrigin[],
  dates: DateRange,
  passengersByOrigin: Map<string, number>,
): Promise<FlightSummary> {
  const provider = getFlightProvider();
  const destinationAirport = destination.airportCodes[0];
  const checkedAt = new Date().toISOString();

  const usable = origins
    .filter((origin) => origin.airport && origin.airport.code !== destinationAirport)
    .slice(0, PLANNING.maxFlightOrigins);

  if (!destinationAirport || usable.length === 0) {
    return {
      perOrigin: [],
      estimatedMinimumFlightCost: null,
      estimatedAverageFlightCost: null,
      estimatedMaximumFlightCost: null,
      currency: "INR",
      checkedAt,
      source: "unavailable",
    };
  }

  const settled = await mapWithConcurrency(usable, PLANNING.flightConcurrency, async (origin) => {
    const offers = await provider.searchFlights({
      originAirport: origin.airport?.code ?? "",
      destinationAirport,
      departureDate: dates.start,
      returnDate: dates.end,
      passengers: passengersByOrigin.get(origin.city) ?? origin.memberIds.length,
      maxConnections: 1,
    });
    return { origin, offers };
  });

  const perOrigin: OriginFlightSummary[] = settled.map((result, index) => {
    const origin = usable[index];
    const base = {
      originCity: origin.city,
      originAirport: origin.airport?.code ?? null,
      memberIds: origin.memberIds,
    };
    if (result.status === "rejected") {
      console.warn(`[flights] ${origin.city} -> ${destinationAirport} failed`, result.reason);
      return { ...base, cheapest: null, error: "We could not check flights from here right now." };
    }
    const cheapest = result.value.offers[0] ?? null;
    return {
      ...base,
      cheapest,
      error: cheapest ? null : "No flights came back for these dates.",
    };
  });

  const prices = perOrigin
    .map((entry) => entry.cheapest?.price)
    .filter((price): price is number => typeof price === "number");

  return {
    perOrigin,
    estimatedMinimumFlightCost: prices.length ? Math.min(...prices) : null,
    estimatedAverageFlightCost: prices.length
      ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
      : null,
    estimatedMaximumFlightCost: prices.length ? Math.max(...prices) : null,
    currency: perOrigin.find((p) => p.cheapest)?.cheapest?.currency ?? "INR",
    checkedAt,
    source: flightsMode() === "live" ? getFlightProvider().source : "demo",
  };
}

/** Distance and time per origin. Road routing only where driving is realistic. */
export async function loadTravelSummary(
  destination: Destination,
  origins: ResolvedOrigin[],
): Promise<TravelSummary> {
  const provider = getRouteProvider();
  const demo = routesMode() === "demo";

  const settled = await mapWithConcurrency(origins.slice(0, PLANNING.maxFlightOrigins), 2, async (origin) => {
    const estimate = estimateTravel(origin, destination);
    if (!estimate) return null;

    if (estimate.mode === "drive" && origin.latitude !== null && origin.longitude !== null) {
      const leg = await provider.drive(
        { latitude: origin.latitude, longitude: origin.longitude },
        destination,
      );
      if (leg) {
        return {
          originCity: origin.city,
          distanceKm: leg.distanceKm,
          durationMinutes: leg.durationMinutes,
          mode: "drive" as const,
          source: demo ? ("demo" as const) : ("google-routes" as const),
        };
      }
    }

    return {
      originCity: origin.city,
      distanceKm: estimate.distanceKm,
      durationMinutes: Math.round(estimate.totalHours * 60),
      mode: estimate.mode,
      source: "estimated" as const,
    };
  });

  const perOrigin: TravelSummary["perOrigin"] = [];
  for (const result of settled) {
    if (result.status === "rejected") {
      console.warn("[routes] origin failed", result.reason);
      continue;
    }
    if (result.value) perOrigin.push(result.value);
  }

  const flying = perOrigin.filter((entry) => entry.mode === "fly").length;

  return {
    perOrigin,
    note:
      flying > 0 && flying < perOrigin.length
        ? "Some of you would drive and some would fly."
        : null,
  };
}

/** Only the categories the group actually cares about are searched. */
export function priorityCategories(
  destination: Destination,
  groupStyles: { style: TripStyle; count: number; mustCount: number }[],
): ActivityCategory[] {
  const tags = new Set(destination.tags);
  const ordered = groupStyles
    .filter((entry) => entry.style !== "mixed")
    .sort((a, b) => b.mustCount - a.mustCount || b.count - a.count)
    .map((entry) => STYLE_TO_CATEGORY[entry.style as Exclude<TripStyle, "mixed">])
    .filter((category): category is ActivityCategory => Boolean(category));

  const matching = ordered.filter((category) => tags.has(category));
  const fallback = destination.tags
    .filter((tag): tag is Exclude<TripStyle, "mixed"> => tag !== "mixed")
    .map((tag) => STYLE_TO_CATEGORY[tag]);

  return Array.from(new Set([...matching, ...fallback])).slice(
    0,
    PLANNING.maxActivityCategories,
  );
}

export async function loadActivities(
  destination: Destination,
  categories: ActivityCategory[],
): Promise<{ activities: Activity[]; source: "google-places" | "demo" }> {
  const provider = getActivityProvider();
  const settled = await mapWithConcurrency(categories, 3, (category) =>
    provider.searchActivities(destination, category, PLANNING.activitiesPerCategory),
  );

  const activities = settled.flatMap((result) => {
    if (result.status === "rejected") {
      console.warn("[activities] category failed", result.reason);
      return [];
    }
    return result.value;
  });

  return { activities, source: activitiesMode() === "live" ? "google-places" : "demo" };
}

export function destinationAirportName(destination: Destination): string | null {
  const code = destination.airportCodes[0];
  return code ? (getAirport(code)?.name ?? code) : null;
}
