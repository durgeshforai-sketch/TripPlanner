import { describe, expect, it } from "vitest";
import { getDestination } from "@/data/destinations";
import {
  checkHardConstraints,
  estimatedCostFor,
  evaluateDealBreaker,
  evaluateMember,
  scoreBudget,
  scoreDuration,
  scoreGroup,
  statusFor,
} from "@/lib/recommendation/scoring";
import { estimateTravel, resolveOrigins } from "@/lib/recommendation/travel";
import { makePreference } from "./factories";
import type { Destination } from "@/types/destination";

const goa = getDestination("goa") as Destination;
const bali = getDestination("bali") as Destination;
const manali = getDestination("manali") as Destination;

const window = { start: "2026-11-13", end: "2026-11-16" };

function contextFor(destination: Destination, preference = makePreference()) {
  const [origin] = resolveOrigins([preference]);
  return {
    destination,
    duration: 4,
    window,
    availability: "preferred" as const,
    travel: estimateTravel(origin, destination),
  };
}

describe("budget scoring", () => {
  const preference = makePreference({ comfortableBudget: 20000, maximumBudget: 30000 });

  it("gives full marks inside the comfortable budget", () => {
    expect(scoreBudget(preference, 18000)).toBe(1);
    expect(scoreBudget(preference, 20000)).toBe(1);
  });

  it("degrades between comfortable and maximum rather than falling off a cliff", () => {
    const midway = scoreBudget(preference, 25000);
    expect(midway).toBeGreaterThan(0);
    expect(midway).toBeLessThan(1);
  });

  it("scores zero above the maximum", () => {
    expect(scoreBudget(preference, 30001)).toBe(0);
  });

  it("penalises a flexible member less than an inflexible one", () => {
    const flexible = makePreference({
      comfortableBudget: 20000,
      maximumBudget: 30000,
      budgetFlexibility: "high",
    });
    const rigid = makePreference({
      comfortableBudget: 20000,
      maximumBudget: 30000,
      budgetFlexibility: "low",
    });
    expect(scoreBudget(flexible, 27000)).toBeGreaterThan(scoreBudget(rigid, 27000));
  });
});

describe("duration scoring", () => {
  const preference = makePreference({ minDays: 3, preferredDays: 4, maxDays: 6 });

  it("peaks at the preferred length", () => {
    expect(scoreDuration(preference, 4)).toBe(1);
  });

  it("falls away from the preferred length", () => {
    expect(scoreDuration(preference, 6)).toBeLessThan(scoreDuration(preference, 5));
  });

  it("scores zero outside the stated range", () => {
    expect(scoreDuration(preference, 2)).toBe(0);
    expect(scoreDuration(preference, 7)).toBe(0);
  });
});

describe("hard constraints", () => {
  it("flags a cost above the member's maximum", () => {
    const preference = makePreference({ comfortableBudget: 5000, maximumBudget: 6000 });
    const context = contextFor(bali, preference);
    const cost = estimatedCostFor(bali, 4, context.travel);
    const violations = checkHardConstraints(preference, context, cost);
    expect(violations.some((v) => v.kind === "budget")).toBe(true);
  });

  it("flags dates the member marked unavailable", () => {
    const preference = makePreference();
    const violations = checkHardConstraints(
      preference,
      { ...contextFor(goa, preference), availability: "unavailable" },
      10000,
    );
    expect(violations.some((v) => v.kind === "dates")).toBe(true);
  });

  it("flags a trip longer than the member can travel", () => {
    const preference = makePreference({ minDays: 2, preferredDays: 3, maxDays: 3 });
    const violations = checkHardConstraints(
      preference,
      { ...contextFor(goa, preference), duration: 6 },
      10000,
    );
    expect(violations.some((v) => v.kind === "duration")).toBe(true);
  });
});

describe("deal-breaker handling", () => {
  it("treats no international travel as a hard violation abroad", () => {
    expect(evaluateDealBreaker("No international travel", bali, null)).toBe("hard");
    expect(evaluateDealBreaker("No international travel", goa, null)).toBe("none");
  });

  it("treats trekking as a soft conflict, not an elimination", () => {
    expect(evaluateDealBreaker("No trekking", manali, null)).toBe("soft");
  });

  it("ignores deal-breakers it cannot honestly evaluate", () => {
    expect(evaluateDealBreaker("No shared rooms", goa, null)).toBe("none");
    expect(evaluateDealBreaker("No extreme heat", goa, null)).toBe("none");
  });

  it("matches free-text deal-breakers by intent", () => {
    expect(evaluateDealBreaker("Nothing abroad please", bali, null)).toBe("hard");
  });

  it("eliminates a member whose deal-breaker the destination violates", () => {
    const preference = makePreference({ dealBreakers: ["No international travel"] });
    const evaluation = evaluateMember(preference, contextFor(bali, preference));
    expect(evaluation.status).toBe("not-fit");
    expect(evaluation.hardViolations.some((v) => v.kind === "deal-breaker")).toBe(true);
  });
});

describe("individual evaluation", () => {
  it("rates a destination on someone's own list above one that is not", () => {
    const named = makePreference({
      destinationMode: "specific",
      desiredDestinations: [
        { destinationId: "goa", name: "Goa", placeId: null, latitude: null, longitude: null },
      ],
    });
    const wanted = evaluateMember(named, contextFor(goa, named));
    const other = evaluateMember(named, contextFor(manali, named));
    expect(wanted.score).toBeGreaterThan(other.score);
    expect(wanted.matchedPreferences.some((m) => m.includes("Goa"))).toBe(true);
  });

  it("explains both what matched and what clashed", () => {
    const preference = makePreference({
      tripStyles: [
        { style: "beach", priority: "must" },
        { style: "nightlife", priority: "nice" },
      ],
    });
    const beachy = evaluateMember(preference, contextFor(goa, preference));
    const mountains = evaluateMember(preference, contextFor(manali, preference));
    expect(beachy.matchedPreferences.length).toBeGreaterThan(0);
    expect(mountains.conflicts.some((c) => c.toLowerCase().includes("beach"))).toBe(true);
  });
});

describe("group scoring", () => {
  const evaluation = (score: number, blocked = false) => ({
    memberId: `m-${score}-${blocked}`,
    score,
    status: statusFor(score),
    matchedPreferences: [],
    conflicts: [],
    hardViolations: blocked ? [{ kind: "budget" as const, message: "too expensive" }] : [],
    estimatedCost: 20000,
  });

  it("prefers an option that works for everyone over one that fails a member", () => {
    const even = scoreGroup({ evaluations: [75, 75, 75, 75, 75].map((s) => evaluation(s)) });
    const lopsided = scoreGroup({
      evaluations: [95, 95, 95, 95, 15].map((s, i) => evaluation(s, i === 4)),
    });
    expect(even.groupScore).toBeGreaterThan(lopsided.groupScore);
  });

  it("counts only members who are genuinely satisfied", () => {
    const result = scoreGroup({
      evaluations: [90, 80, 70, 50, 30].map((s) => evaluation(s)),
    });
    expect(result.membersSatisfied).toBe(3);
  });

  it("scores an empty group at zero rather than throwing", () => {
    expect(scoreGroup({ evaluations: [] }).groupScore).toBe(0);
  });
});
