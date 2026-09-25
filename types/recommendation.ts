import type { Activity } from "./activity";
import type { Destination } from "./destination";
import type { FlightSummary } from "./flight";
import type { TransportSummary } from "./transport";
import type { DateRange, TripStyle } from "./preferences";

export type FitStatus = "strong" | "good" | "partial" | "not-fit";

export interface IndividualFit {
  memberId: string;
  memberName: string;
  score: number;
  status: FitStatus;
  matchedPreferences: string[];
  conflicts: string[];
}

export interface ItineraryItem {
  time: "morning" | "afternoon" | "evening";
  title: string;
  detail: string | null;
  placeId: string | null;
}

export interface ItineraryDay {
  day: number;
  date: string;
  title: string;
  items: ItineraryItem[];
}

export interface TravelSummary {
  perOrigin: {
    originCity: string;
    distanceKm: number | null;
    durationMinutes: number | null;
    mode: "drive" | "fly";
    source: "google-routes" | "estimated" | "demo";
  }[];
  note: string | null;
}

export interface EstimatedBudget {
  perPersonMin: number;
  perPersonMax: number;
  currency: string;
  /** How the number was built, shown to users so it is never a magic figure. */
  breakdown: { label: string; amount: number }[];
}

export interface RecommendationOption {
  id: string;
  runId: string;
  rank: number;
  destinationId: string;
  destination: Destination;
  dates: DateRange;
  duration: number;
  estimatedBudget: EstimatedBudget;
  groupScore: number;
  membersSatisfied: number;
  memberCount: number;
  individualFit: IndividualFit[];
  conflicts: string[];
  reasons: string[];
  compromise: string | null;
  topStyles: TripStyle[];
  flightSummary: FlightSummary | null;
  travelSummary: TravelSummary | null;
  /** Every practical way of getting there, per origin city. */
  transportSummary: TransportSummary | null;
  activities: Activity[];
  itinerary: ItineraryDay[];
  sourceTimestamps: Record<string, string>;
  explanationSource: "ai" | "deterministic";
}

export interface GroupSnapshot {
  memberCount: number;
  submittedCount: number;
  /**
   * Members the options were built without, because they had not answered when
   * the organiser chose to go ahead. Surfaced so nobody is quietly left out.
   */
  excludedMembers: string[];
  budget: {
    comfortableMin: number;
    comfortableMax: number;
    lowestMaximum: number;
    overlapLow: number | null;
    overlapHigh: number | null;
  };
  dates: {
    overlapRanges: DateRange[];
    membersWithNoOverlap: { memberId: string; memberName: string }[];
  };
  duration: { min: number; max: number; consensus: number | null };
  topStyles: { style: TripStyle; count: number; mustCount: number }[];
  commonMustHaves: { value: string; count: number }[];
  commonDealBreakers: { value: string; count: number }[];
  commonDestinations: { name: string; count: number }[];
  scope: { domestic: number; international: number; either: number; resolved: "domestic" | "international" | "either" };
  origins: { city: string; memberIds: string[] }[];
  conflicts: string[];
  headlines: string[];
}

export type RunStatus = "pending" | "running" | "complete" | "failed";

export interface RecommendationRun {
  id: string;
  tripId: string;
  status: RunStatus;
  engineVersion: string;
  createdAt: string;
  completedAt: string | null;
  snapshot: GroupSnapshot | null;
  /** Populated when fewer than three options were feasible. */
  shortfallReason: string | null;
  options: RecommendationOption[];
}

export interface Vote {
  memberId: string;
  memberName: string;
  optionId: string | null;
}

export interface DecisionState {
  status: "open" | "runoff" | "final";
  selectedOptionId: string | null;
  votes: Vote[];
  tally: { optionId: string; count: number }[];
  tiedOptionIds: string[];
}
