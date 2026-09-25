import { DESTINATIONS, findDestinationByName, getDestination } from "@/data/destinations";
import type { Destination } from "@/types/destination";
import type { Preference, TripStyle } from "@/types/preferences";

/**
 * Builds the pool the engine scores. Anything a member explicitly asked for is
 * always a candidate, even if it looks like a poor fit — the group should see
 * why their own suggestion did or did not work, not have it quietly dropped.
 */
export function buildCandidatePool(preferences: Preference[]): Destination[] {
  const chosen = new Map<string, Destination>();

  for (const preference of preferences) {
    for (const wanted of preference.desiredDestinations) {
      const match =
        (wanted.destinationId ? getDestination(wanted.destinationId) : undefined) ??
        findDestinationByName(wanted.name);
      if (match) chosen.set(match.id, match);
    }
  }

  const everyoneDomestic =
    preferences.length > 0 && preferences.every((p) => p.travelScope === "domestic");
  const everyoneInternational =
    preferences.length > 0 && preferences.every((p) => p.travelScope === "international");

  // A hard "no international travel" from anyone removes those candidates.
  const blocksInternational = preferences.some((p) =>
    p.dealBreakers.some((d) => /international|abroad/i.test(d)),
  );

  const wanted = new Set<TripStyle>();
  for (const preference of preferences) {
    for (const style of preference.tripStyles) {
      if (style.priority !== "dont-care") wanted.add(style.style);
    }
  }

  const affordableCeiling = Math.max(...preferences.map((p) => p.maximumBudget), 0);
  const shortestDuration = Math.max(...preferences.map((p) => p.minDays), 1);

  for (const destination of DESTINATIONS) {
    if (chosen.has(destination.id)) continue;
    if (destination.scope === "international" && (blocksInternational || everyoneDomestic)) continue;
    if (destination.scope === "domestic" && everyoneInternational) continue;
    // Cheapest conceivable version of this trip: nobody can afford it, skip it.
    if (affordableCeiling > 0 && destination.dailyCostINR * shortestDuration > affordableCeiling) {
      continue;
    }

    // With no stated styles everything stays in; otherwise require some overlap.
    const overlaps =
      wanted.size === 0 ||
      wanted.has("mixed") ||
      destination.tags.some((tag) => wanted.has(tag));
    if (!overlaps) continue;

    chosen.set(destination.id, destination);
  }

  return Array.from(chosen.values());
}
