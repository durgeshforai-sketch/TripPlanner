import type { Preference, PreferenceInput } from "@/types/preferences";

let counter = 0;

export function makePreference(overrides: Partial<Preference> = {}): Preference {
  counter += 1;
  const base: Preference = {
    id: `pref-${counter}`,
    tripId: "trip-1",
    memberId: `member-${counter}`,
    travelScope: "either",
    destinationMode: "open",
    desiredDestinations: [],
    originCity: "Bengaluru",
    originPlaceId: null,
    originLatitude: 12.9716,
    originLongitude: 77.5946,
    nearestAirport: "BLR",
    comfortableBudget: 20000,
    maximumBudget: 25000,
    budgetFlexibility: "medium",
    preferredDates: [{ start: "2026-11-13", end: "2026-11-17" }],
    possibleDates: [],
    unavailableDates: [],
    minDays: 3,
    preferredDays: 4,
    maxDays: 5,
    tripStyles: [{ style: "relaxed", priority: "nice" }],
    mustHaves: [],
    dealBreakers: [],
    transportModes: ["fly", "train", "bus", "drive"],
    submittedAt: "2026-09-20T00:00:00.000Z",
    createdAt: "2026-09-20T00:00:00.000Z",
    updatedAt: "2026-09-20T00:00:00.000Z",
  };
  return { ...base, ...overrides };
}

export function toInput(preference: Preference): PreferenceInput {
  const { id: _id, tripId: _t, memberId: _m, submittedAt: _s, createdAt: _c, updatedAt: _u, ...rest } =
    preference;
  return rest;
}
