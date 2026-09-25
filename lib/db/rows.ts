import "server-only";
import type { Json } from "@/types/database";
import type { Member, Trip } from "@/types/trip";
import type { Preference } from "@/types/preferences";
import type { TransportMode } from "@/types/transport";
import type { Database } from "@/types/database";

type Tables = Database["tripsync"]["Tables"];
export type TripRow = Tables["trips"]["Row"];
export type MemberRow = Tables["members"]["Row"];
export type PreferenceRow = Tables["preferences"]["Row"];
export type RunRow = Tables["recommendation_runs"]["Row"];
export type OptionRow = Tables["recommendation_options"]["Row"];
export type FitRow = Tables["option_member_fits"]["Row"];
export type DecisionRow = Tables["decisions"]["Row"];
export type VoteRow = Tables["decision_votes"]["Row"];
export type MemoryRow = Tables["memories"]["Row"];

/**
 * jsonb columns come back as `Json`. Everything we read was written by this app
 * after Zod validation, so reading is a widening cast rather than a re-parse —
 * with a shape guard so a manual DB edit degrades instead of crashing.
 */
export function jsonArray<T>(value: Json): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function jsonObject<T>(value: Json, fallback: T): T {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as T)
    : fallback;
}

export function jsonOrNull<T>(value: Json): T | null {
  return value === null ? null : (value as T);
}

export function toTrip(row: TripRow): Trip {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    inviteCode: row.invite_code,
    status: row.status as Trip["status"],
    expectedMembers: row.expected_members,
    ownerMemberId: row.owner_member_id,
    coverPhotoPath: row.cover_photo_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toMember(row: MemberRow): Member {
  return {
    id: row.id,
    tripId: row.trip_id,
    name: row.name,
    role: row.role as Member["role"],
    status: row.status as Member["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toPreference(row: PreferenceRow): Preference {
  return {
    id: row.id,
    tripId: row.trip_id,
    memberId: row.member_id,
    travelScope: row.travel_scope as Preference["travelScope"],
    destinationMode: row.destination_mode as Preference["destinationMode"],
    desiredDestinations: jsonArray(row.desired_destinations),
    originCity: row.origin_city,
    originPlaceId: row.origin_place_id,
    originLatitude: row.origin_latitude,
    originLongitude: row.origin_longitude,
    nearestAirport: row.nearest_airport,
    comfortableBudget: Number(row.comfortable_budget),
    maximumBudget: Number(row.maximum_budget),
    budgetFlexibility: row.budget_flexibility as Preference["budgetFlexibility"],
    preferredDates: jsonArray(row.preferred_dates),
    possibleDates: jsonArray(row.possible_dates),
    unavailableDates: jsonArray(row.unavailable_dates),
    minDays: row.min_days,
    preferredDays: row.preferred_days,
    maxDays: row.max_days,
    tripStyles: jsonArray(row.trip_styles),
    mustHaves: jsonArray(row.must_haves),
    dealBreakers: jsonArray(row.deal_breakers),
    transportModes: jsonArray<TransportMode>(row.transport_modes),
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
