import { describe, expect, it } from "vitest";
import { findLongWeekends } from "@/lib/holidays/longWeekends";
import type { Holiday } from "@/lib/providers/types";

const holiday = (date: string, name: string): Holiday => ({
  date,
  localName: name,
  name,
  countryCode: "IN",
});

describe("long weekend detection", () => {
  // 2026-11-14 is a Saturday, 15th Sunday, 16th Monday.
  it("treats a Monday holiday plus the weekend as a three-day opportunity", () => {
    const found = findLongWeekends([holiday("2026-11-16", "Test Holiday")], {
      from: "2026-11-01",
      to: "2026-11-30",
    });
    const window = found.find((w) => w.start === "2026-11-14");
    expect(window).toBeDefined();
    expect(window?.end).toBe("2026-11-16");
    expect(window?.days).toBe(3);
    expect(window?.label).toBe("3-day weekend");
  });

  it("treats a Friday holiday plus the weekend as a three-day opportunity", () => {
    // 2026-11-13 is a Friday.
    const found = findLongWeekends([holiday("2026-11-13", "Test Holiday")], {
      from: "2026-11-01",
      to: "2026-11-30",
    });
    const window = found.find((w) => w.start === "2026-11-13");
    expect(window?.days).toBe(3);
    expect(window?.end).toBe("2026-11-15");
  });

  it("does not report a plain weekend", () => {
    const found = findLongWeekends([], { from: "2026-11-01", to: "2026-11-30" });
    expect(found).toHaveLength(0);
  });

  it("extends the window using days the member already marked free", () => {
    const found = findLongWeekends([holiday("2026-11-16", "Test Holiday")], {
      from: "2026-11-01",
      to: "2026-11-30",
      availability: [{ start: "2026-11-17", end: "2026-11-17" }],
    });
    const window = found.find((w) => w.start === "2026-11-14");
    expect(window?.extended).toEqual({ start: "2026-11-14", end: "2026-11-17", days: 4 });
    expect(window?.label).toContain("4 days");
  });

  it("reports a bridge day when one day of leave joins two breaks", () => {
    // Holiday on Tuesday 2026-11-17: Sat/Sun + Monday off = 4 days.
    const found = findLongWeekends([holiday("2026-11-17", "Test Holiday")], {
      from: "2026-11-01",
      to: "2026-11-30",
    });
    const bridged = found.find((w) => w.bridgeDays.length > 0);
    expect(bridged?.bridgeDays).toEqual(["2026-11-16"]);
    expect(bridged?.days).toBe(4);
    expect(bridged?.label).toContain("Monday");
  });

  it("does not invent holidays when none are supplied", () => {
    const found = findLongWeekends([], {
      from: "2026-11-01",
      to: "2026-11-30",
      availability: [{ start: "2026-11-16", end: "2026-11-20" }],
    });
    expect(found).toHaveLength(0);
  });
});
