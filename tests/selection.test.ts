import { describe, expect, it } from "vitest";
import { selectShortlist } from "@/lib/recommendation/select";
import { buildGroupSnapshot } from "@/lib/recommendation/analysis";
import { makePreference } from "./factories";
import type { Preference } from "@/types/preferences";
import type { Member } from "@/types/trip";

const TODAY = new Date("2026-09-24T00:00:00Z");
const DATES = [{ start: "2026-11-12", end: "2026-11-22" }];

/**
 * The reference group: five friends, four-day preference, budgets of ₹20k-25k,
 * three want a beach, one wants mountains, one is flexible.
 */
function referenceGroup(): Preference[] {
  const base = {
    preferredDates: DATES,
    minDays: 3,
    preferredDays: 4,
    maxDays: 5,
    comfortableBudget: 20000,
    maximumBudget: 25000,
    travelScope: "either" as const,
  };
  return [
    makePreference({ ...base, memberId: "beach-1", tripStyles: [{ style: "beach", priority: "must" }] }),
    makePreference({ ...base, memberId: "beach-2", tripStyles: [{ style: "beach", priority: "must" }] }),
    makePreference({ ...base, memberId: "beach-3", tripStyles: [{ style: "beach", priority: "nice" }] }),
    makePreference({ ...base, memberId: "mountain-1", tripStyles: [{ style: "nature", priority: "must" }] }),
    makePreference({ ...base, memberId: "flexible-1", tripStyles: [{ style: "mixed", priority: "nice" }], budgetFlexibility: "high" }),
  ];
}

const members = (preferences: Preference[]): Member[] =>
  preferences.map((p) => ({
    id: p.memberId,
    tripId: "trip-1",
    name: p.memberId,
    role: "participant" as const,
    status: "submitted" as const,
    createdAt: "2026-09-20T00:00:00.000Z",
    updatedAt: "2026-09-20T00:00:00.000Z",
  }));

describe("top 3 selection", () => {
  it("returns three distinct destinations for a workable group", () => {
    const { candidates, shortfallReason } = selectShortlist(referenceGroup(), { today: TODAY });
    expect(candidates).toHaveLength(3);
    expect(new Set(candidates.map((c) => c.destination.id)).size).toBe(3);
    expect(shortfallReason).toBeNull();
  });

  it("ranks by group score, strongest first", () => {
    const { candidates } = selectShortlist(referenceGroup(), { today: TODAY });
    const scores = candidates.map((c) => c.groupScore);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it("favours the majority style without being tied to one destination", () => {
    const { candidates } = selectShortlist(referenceGroup(), { today: TODAY });
    const winner = candidates[0];
    // Three of five asked for a beach, so the top option should offer one.
    expect(winner.destination.tags).toContain("beach");
    // And the members who asked for it should be the ones it works best for.
    const beachScores = winner.evaluations
      .filter((e) => e.memberId.startsWith("beach"))
      .map((e) => e.score);
    const mountainScore = winner.evaluations.find((e) => e.memberId === "mountain-1")?.score ?? 0;
    expect(Math.min(...beachScores)).toBeGreaterThanOrEqual(mountainScore);
  });

  it("keeps every option inside the dates the group offered", () => {
    const { candidates } = selectShortlist(referenceGroup(), { today: TODAY });
    for (const candidate of candidates) {
      expect(candidate.window.start >= "2026-11-12").toBe(true);
      expect(candidate.window.end <= "2026-11-22").toBe(true);
      expect(candidate.window.duration).toBeGreaterThanOrEqual(3);
      expect(candidate.window.duration).toBeLessThanOrEqual(5);
    }
  });

  it("never hides the member an option does not suit", () => {
    const preferences = referenceGroup();
    preferences[3] = makePreference({
      ...preferences[3],
      memberId: "mountain-1",
      dealBreakers: ["No beach"],
    });
    const { candidates } = selectShortlist(preferences, { today: TODAY });
    const beachOption = candidates.find((c) => c.destination.tags.includes("beach"));
    if (beachOption) {
      const mountain = beachOption.evaluations.find((e) => e.memberId === "mountain-1");
      expect(mountain?.conflicts.length).toBeGreaterThan(0);
    }
  });
});

describe("hard constraint elimination", () => {
  it("drops destinations that break a hard limit for most of the group", () => {
    const strict = referenceGroup().map((p) =>
      makePreference({ ...p, dealBreakers: ["No international travel"] }),
    );
    const { candidates } = selectShortlist(strict, { today: TODAY });
    expect(candidates.length).toBeGreaterThan(0);
    for (const candidate of candidates) {
      expect(candidate.destination.scope).toBe("domestic");
    }
  });

  it("explains itself instead of padding when nothing fits", () => {
    const impossible = referenceGroup().map((p) =>
      makePreference({ ...p, comfortableBudget: 500, maximumBudget: 800 }),
    );
    const result = selectShortlist(impossible, { today: TODAY });
    expect(result.candidates.length).toBeLessThan(3);
    expect(result.shortfallReason).toBeTruthy();
  });

  it("never invents a third option just to reach three", () => {
    const narrow = referenceGroup().map((p) =>
      makePreference({
        ...p,
        destinationMode: "specific",
        desiredDestinations: [
          { destinationId: "goa", name: "Goa", placeId: null, latitude: null, longitude: null },
        ],
        travelScope: "domestic",
        comfortableBudget: 12000,
        maximumBudget: 14000,
      }),
    );
    const result = selectShortlist(narrow, { today: TODAY });
    expect(result.candidates.length).toBeLessThanOrEqual(3);
    if (result.candidates.length < 3) expect(result.shortfallReason).toBeTruthy();
  });

  it("always considers a destination someone explicitly asked for", () => {
    const preferences = referenceGroup();
    preferences[0] = makePreference({
      ...preferences[0],
      destinationMode: "specific",
      desiredDestinations: [
        { destinationId: "hampi", name: "Hampi", placeId: null, latitude: null, longitude: null },
      ],
    });
    const { candidates } = selectShortlist(preferences, { today: TODAY, size: 40 });
    expect(candidates.some((c) => c.destination.id === "hampi")).toBe(true);
  });
});

describe("group consensus", () => {
  it("reports the shared budget band and the agreed trip length", () => {
    const preferences = referenceGroup();
    const snapshot = buildGroupSnapshot(preferences, members(preferences));
    expect(snapshot.budget.overlapLow).toBe(20000);
    expect(snapshot.budget.overlapHigh).toBe(25000);
    expect(snapshot.duration.consensus).toBe(4);
    expect(snapshot.headlines[0]).toContain("4-day");
  });

  it("finds the dates everyone can make", () => {
    const preferences = referenceGroup();
    const snapshot = buildGroupSnapshot(preferences, members(preferences));
    expect(snapshot.dates.overlapRanges).toEqual([{ start: "2026-11-12", end: "2026-11-22" }]);
  });

  it("names the member who cannot make the group's dates", () => {
    const preferences = referenceGroup();
    preferences[3] = makePreference({
      ...preferences[3],
      memberId: "mountain-1",
      preferredDates: [{ start: "2026-12-05", end: "2026-12-10" }],
      unavailableDates: [{ start: "2026-11-12", end: "2026-11-22" }],
    });
    const snapshot = buildGroupSnapshot(preferences, members(preferences));
    expect(snapshot.dates.membersWithNoOverlap.map((m) => m.memberName)).toContain("mountain-1");
    expect(snapshot.conflicts.join(" ")).toContain("mountain-1");
  });

  it("surfaces a budget clash rather than averaging it away", () => {
    const preferences = referenceGroup();
    preferences[0] = makePreference({
      ...preferences[0],
      comfortableBudget: 60000,
      maximumBudget: 80000,
    });
    preferences[1] = makePreference({
      ...preferences[1],
      comfortableBudget: 9000,
      maximumBudget: 10000,
    });
    const snapshot = buildGroupSnapshot(preferences, members(preferences));
    expect(snapshot.budget.overlapLow).toBe(9000);
    expect(snapshot.conflicts.join(" ")).toContain("Budgets do not fully overlap");
  });

  it("reports a split between domestic and international", () => {
    const preferences = referenceGroup();
    preferences[0] = makePreference({ ...preferences[0], travelScope: "domestic" });
    preferences[1] = makePreference({ ...preferences[1], travelScope: "international" });
    const snapshot = buildGroupSnapshot(preferences, members(preferences));
    expect(snapshot.conflicts.join(" ")).toMatch(/stay in the country/);
  });

  it("turns deal-breakers it cannot check into booking notes", () => {
    const preferences = referenceGroup();
    preferences[0] = makePreference({ ...preferences[0], dealBreakers: ["No shared rooms"] });
    const snapshot = buildGroupSnapshot(preferences, members(preferences));
    expect(snapshot.conflicts.join(" ")).toContain("private rooms");
  });
});
