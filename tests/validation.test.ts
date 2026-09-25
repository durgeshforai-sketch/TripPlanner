import { describe, expect, it } from "vitest";
import { preferenceSchema } from "@/lib/validation/preferences";
import { makePreference, toInput } from "./factories";

const valid = toInput(makePreference());

describe("budget validation", () => {
  it("accepts a maximum above the comfortable budget", () => {
    const result = preferenceSchema.safeParse({
      ...valid,
      comfortableBudget: 20000,
      maximumBudget: 30000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a maximum below the comfortable budget", () => {
    const result = preferenceSchema.safeParse({
      ...valid,
      comfortableBudget: 30000,
      maximumBudget: 20000,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((i) => i.path.includes("maximumBudget"))).toBe(true);
  });

  it("accepts equal comfortable and maximum budgets", () => {
    expect(
      preferenceSchema.safeParse({ ...valid, comfortableBudget: 25000, maximumBudget: 25000 })
        .success,
    ).toBe(true);
  });
});

describe("date validation", () => {
  it("rejects a range that ends before it starts", () => {
    const result = preferenceSchema.safeParse({
      ...valid,
      preferredDates: [{ start: "2026-11-20", end: "2026-11-15" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects preferred dates that are also marked unavailable", () => {
    const result = preferenceSchema.safeParse({
      ...valid,
      preferredDates: [{ start: "2026-11-13", end: "2026-11-17" }],
      unavailableDates: [{ start: "2026-11-16", end: "2026-11-18" }],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((i) => i.path.includes("preferredDates"))).toBe(true);
  });

  it("rejects durations that are not ordered", () => {
    expect(
      preferenceSchema.safeParse({ ...valid, minDays: 5, preferredDays: 3, maxDays: 4 }).success,
    ).toBe(false);
  });

  it("accepts min <= preferred <= max", () => {
    expect(
      preferenceSchema.safeParse({ ...valid, minDays: 3, preferredDays: 4, maxDays: 6 }).success,
    ).toBe(true);
  });
});

describe("list hygiene", () => {
  it("trims and de-duplicates deal-breakers case-insensitively", () => {
    const result = preferenceSchema.parse({
      ...valid,
      dealBreakers: ["No trekking", "  no trekking ", "No long travel"],
    });
    expect(result.dealBreakers).toEqual(["No trekking", "No long travel"]);
  });

  it("requires at least one place when the member said they have places in mind", () => {
    expect(
      preferenceSchema.safeParse({ ...valid, destinationMode: "specific", desiredDestinations: [] })
        .success,
    ).toBe(false);
  });
});
