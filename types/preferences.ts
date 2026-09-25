import type { TransportMode } from "./transport";

export type TravelScope = "domestic" | "international" | "either";
export type DestinationMode = "specific" | "open";
export type BudgetFlexibility = "low" | "medium" | "high";

export const TRIP_STYLES = [
  "adventure",
  "relaxed",
  "sightseeing",
  "beach",
  "food",
  "nightlife",
  "nature",
  "culture",
  "shopping",
  "mixed",
] as const;
export type TripStyle = (typeof TRIP_STYLES)[number];

export const TRIP_STYLE_LABELS: Record<TripStyle, string> = {
  adventure: "Adventure",
  relaxed: "Relaxed",
  sightseeing: "Sightseeing",
  beach: "Beach",
  food: "Food",
  nightlife: "Nightlife",
  nature: "Nature",
  culture: "Culture",
  shopping: "Shopping",
  mixed: "Mix of everything",
};

export type StylePriority = "must" | "nice" | "dont-care";

export interface StylePreference {
  style: TripStyle;
  priority: StylePriority;
}

/** Inclusive ISO date range, `yyyy-MM-dd`. */
export interface DateRange {
  start: string;
  end: string;
}

export interface DesiredDestination {
  /** Matches a catalog destination id when we can resolve it, else null. */
  destinationId: string | null;
  name: string;
  placeId: string | null;
  latitude: number | null;
  longitude: number | null;
}

export const COMMON_MUST_HAVES = [
  "Beach",
  "Good food",
  "Nightlife",
  "Nature",
  "Picturesque places",
  "Local experiences",
  "Shopping",
  "Adventure sports",
] as const;

export const COMMON_DEAL_BREAKERS = [
  "No long travel",
  "No overnight buses",
  "No trekking",
  "No party destinations",
  "No shared rooms",
  "No international travel",
  "No extreme heat",
  "No crowded places",
] as const;

export interface Preference {
  id: string;
  tripId: string;
  memberId: string;

  travelScope: TravelScope;
  destinationMode: DestinationMode;
  desiredDestinations: DesiredDestination[];

  originCity: string;
  originPlaceId: string | null;
  originLatitude: number | null;
  originLongitude: number | null;
  nearestAirport: string | null;

  comfortableBudget: number;
  maximumBudget: number;
  budgetFlexibility: BudgetFlexibility;

  preferredDates: DateRange[];
  possibleDates: DateRange[];
  unavailableDates: DateRange[];

  minDays: number;
  preferredDays: number;
  maxDays: number;

  tripStyles: StylePreference[];
  mustHaves: string[];
  dealBreakers: string[];
  /** Ways this member is willing to travel. */
  transportModes: TransportMode[];

  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Everything a participant fills in; the DB adds ids and timestamps. */
export type PreferenceInput = Omit<
  Preference,
  "id" | "tripId" | "memberId" | "submittedAt" | "createdAt" | "updatedAt"
>;
