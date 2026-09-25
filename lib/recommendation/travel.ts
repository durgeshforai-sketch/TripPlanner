import { airportForCity, getAirport, nearestAirport, type Airport } from "@/data/airports";
import { haversineKm } from "@/lib/providers/googleRoutes";
import { FLIGHT_ESTIMATE } from "./config";
import type { Destination } from "@/types/destination";
import type { Preference } from "@/types/preferences";

export interface ResolvedOrigin {
  memberIds: string[];
  city: string;
  latitude: number | null;
  longitude: number | null;
  airport: Airport | null;
}

/**
 * Members often travel from different cities, so origins are de-duplicated once
 * and reused for every destination. That keeps flight lookups bounded.
 */
export function resolveOrigins(preferences: Preference[]): ResolvedOrigin[] {
  const byKey = new Map<string, ResolvedOrigin>();

  for (const preference of preferences) {
    const airport = resolveAirport(preference);
    const key = (airport?.code ?? preference.originCity.trim().toLowerCase()) || "unknown";
    const existing = byKey.get(key);
    if (existing) {
      existing.memberIds.push(preference.memberId);
      continue;
    }
    byKey.set(key, {
      memberIds: [preference.memberId],
      city: preference.originCity.trim() || airport?.city || "Unknown",
      latitude: preference.originLatitude ?? airport?.latitude ?? null,
      longitude: preference.originLongitude ?? airport?.longitude ?? null,
      airport: airport ?? null,
    });
  }

  return Array.from(byKey.values());
}

function resolveAirport(preference: Preference): Airport | null {
  if (preference.nearestAirport) {
    const explicit = getAirport(preference.nearestAirport);
    if (explicit) return explicit;
  }
  if (preference.originLatitude !== null && preference.originLongitude !== null) {
    return nearestAirport(preference.originLatitude, preference.originLongitude);
  }
  return airportForCity(preference.originCity);
}

export interface TravelEstimate {
  distanceKm: number;
  /** Door-to-door hours including airport time, used for travel-time scoring. */
  totalHours: number;
  flightCostINR: number;
  mode: "drive" | "fly";
  international: boolean;
}

/**
 * Pre-flight-search estimate. It is deterministic and derived from distance, and
 * is replaced by live prices for shortlisted destinations. Always labelled as an
 * estimate in the UI.
 */
export function estimateTravel(
  origin: ResolvedOrigin,
  destination: Destination,
): TravelEstimate | null {
  const from =
    origin.latitude !== null && origin.longitude !== null
      ? { latitude: origin.latitude, longitude: origin.longitude }
      : origin.airport;
  if (!from) return null;

  const distanceKm = haversineKm(from, destination);
  const international =
    (origin.airport?.countryCode ?? "IN").toUpperCase() !== destination.countryCode.toUpperCase();

  // Short domestic hops are usually driven; the estimate follows suit.
  const mode: "drive" | "fly" = !international && distanceKm < 350 ? "drive" : "fly";

  if (mode === "drive") {
    const roadKm = Math.round(distanceKm * 1.25);
    return {
      distanceKm: roadKm,
      totalHours: Number((roadKm / 48).toFixed(1)),
      // Shared road travel, per person, both ways.
      flightCostINR: Math.round((roadKm * 2 * 12) / 4),
      mode,
      international,
    };
  }

  const base = international
    ? FLIGHT_ESTIMATE.internationalBaseINR
    : FLIGHT_ESTIMATE.domesticBaseINR;
  const perKm = international
    ? FLIGHT_ESTIMATE.internationalPerKm
    : FLIGHT_ESTIMATE.domesticPerKm;

  const minutes =
    (distanceKm / FLIGHT_ESTIMATE.cruiseKmPerHour) * 60 + FLIGHT_ESTIMATE.fixedOverheadMinutes;

  return {
    distanceKm,
    totalHours: Number((minutes / 60).toFixed(1)),
    flightCostINR: Math.round((base + distanceKm * perKm) / 100) * 100,
    mode,
    international,
  };
}
