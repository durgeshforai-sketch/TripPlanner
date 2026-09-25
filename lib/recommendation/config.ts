import type { TripStyle } from "@/types/preferences";
import type { ActivityCategory } from "@/types/activity";

export const ENGINE_VERSION = "1.0.0";

/**
 * Every number the engine uses lives here. Nothing is a magic constant buried
 * in the scoring code, so weights can be tuned without reading the algorithm.
 */
export const WEIGHTS = {
  /** Individual compatibility. Must sum to 100. */
  individual: {
    budget: 25,
    dates: 20,
    destinationPreference: 15,
    duration: 10,
    style: 15,
    travelTime: 10,
    other: 5,
  },
  /** How individual scores roll up into one group score. Must sum to 1. */
  group: {
    average: 0.5,
    /** Weighting the worst-off member keeps "great for 4, awful for 1" out of the top 3. */
    lowest: 0.25,
    hardConstraintsSatisfied: 0.15,
    consensus: 0.1,
  },
} as const;

export const THRESHOLDS = {
  fit: { strong: 80, good: 65, partial: 45 },
  /** A member counts as "satisfied" at or above this score with no hard violation. */
  satisfied: 65,
  /** Drop a candidate when this share of the group has a hard violation. */
  disqualifyWhenHardViolationShareAbove: 0.5,
  /** Travel time in hours at which travel-time fit bottoms out. */
  travelTimeCeilingHours: 14,
  travelTimeFloorHours: 2,
  /** Door-to-door hours beyond which "No long travel" is treated as violated. */
  longTravelHours: 8,
} as const;

export const PLANNING = {
  /** How far ahead to look when nobody entered usable dates. */
  fallbackHorizonDays: 150,
  /** Earliest a trip can start, so results are always bookable. */
  minLeadDays: 7,
  maxCandidateWindows: 6,
  maxCandidateDurations: 3,
  /** Destinations kept after deterministic scoring, before enrichment. */
  shortlistSize: 3,
  /** Enrichment limits — these bound paid API usage per run. */
  maxActivityCategories: 4,
  activitiesPerCategory: 4,
  maxFlightOrigins: 4,
  flightConcurrency: 3,
} as const;

/** Flight cost model used before live prices are available. Always labelled. */
export const FLIGHT_ESTIMATE = {
  domesticBaseINR: 4200,
  domesticPerKm: 4.4,
  internationalBaseINR: 9000,
  internationalPerKm: 3.6,
  /** Average cruise speed used to turn distance into flying time. */
  cruiseKmPerHour: 780,
  fixedOverheadMinutes: 150,
} as const;

/** Free-text must-haves mapped onto destination tags we can actually check. */
export const MUST_HAVE_TAGS: Record<string, TripStyle[]> = {
  beach: ["beach"],
  beaches: ["beach"],
  "good food": ["food"],
  food: ["food"],
  nightlife: ["nightlife"],
  party: ["nightlife"],
  nature: ["nature"],
  "picturesque places": ["nature", "sightseeing"],
  scenery: ["nature", "sightseeing"],
  "local experiences": ["culture"],
  culture: ["culture"],
  shopping: ["shopping"],
  "adventure sports": ["adventure"],
  adventure: ["adventure"],
  trekking: ["adventure", "nature"],
  sightseeing: ["sightseeing"],
  relaxation: ["relaxed"],
};

export type DealBreakerKind = "hard" | "soft" | "not-evaluable";

export interface DealBreakerRule {
  kind: DealBreakerKind;
  /** Why we cannot check it, shown to the group instead of silently ignoring it. */
  note?: string;
}

/**
 * Deal-breakers are only enforced when we can genuinely evaluate them.
 * Anything we cannot check is reported to the group as a booking note rather
 * than quietly dropped or, worse, guessed at.
 */
export const DEAL_BREAKER_RULES: Record<string, DealBreakerRule> = {
  "no international travel": { kind: "hard" },
  "no long travel": { kind: "hard" },
  "no party destinations": { kind: "hard" },
  "no trekking": { kind: "soft" },
  "no overnight buses": {
    kind: "not-evaluable",
    note: "Book flights or trains rather than overnight buses",
  },
  "no shared rooms": {
    kind: "not-evaluable",
    note: "Pick accommodation with private rooms",
  },
  "no extreme heat": {
    kind: "not-evaluable",
    note: "Check the weather for your dates before booking",
  },
  "no crowded places": {
    kind: "not-evaluable",
    note: "Avoid peak-season weekends where you can",
  },
};

export const STYLE_TO_CATEGORY: Record<Exclude<TripStyle, "mixed">, ActivityCategory> = {
  adventure: "adventure",
  relaxed: "relaxed",
  sightseeing: "sightseeing",
  beach: "beach",
  food: "food",
  nightlife: "nightlife",
  nature: "nature",
  culture: "culture",
  shopping: "shopping",
};
