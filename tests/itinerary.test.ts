import { describe, expect, it } from "vitest";
import { generateItinerary } from "@/lib/itinerary/generate";
import { DemoActivityProvider } from "@/lib/providers/demo";
import { getDestination } from "@/data/destinations";
import type { Destination } from "@/types/destination";

const goa = getDestination("goa") as Destination;
const provider = new DemoActivityProvider();

async function activities() {
  const beach = await provider.searchActivities(goa, "beach", 4);
  const food = await provider.searchActivities(goa, "food", 4);
  return [...beach, ...food];
}

describe("itinerary generation", () => {
  it("produces one day per night of the trip", async () => {
    const days = generateItinerary({
      destination: goa,
      start: "2026-11-13",
      duration: 4,
      activities: await activities(),
      priorityCategories: ["beach", "food"],
    });
    expect(days).toHaveLength(4);
    expect(days.map((d) => d.day)).toEqual([1, 2, 3, 4]);
    expect(days[0].date).toBe("2026-11-13");
    expect(days[3].date).toBe("2026-11-16");
  });

  it("keeps arrival and departure days light", async () => {
    const days = generateItinerary({
      destination: goa,
      start: "2026-11-13",
      duration: 4,
      activities: await activities(),
      priorityCategories: ["beach", "food"],
    });
    expect(days[0].title).toBe("Arrival");
    expect(days[0].items[0].title).toContain("Arrive");
    expect(days[3].title).toBe("Departure");
    expect(days[3].items.at(-1)?.title).toContain("Depart");
  });

  it("never schedules the same place twice", async () => {
    const pool = await activities();
    const days = generateItinerary({
      destination: goa,
      start: "2026-11-13",
      duration: 6,
      activities: pool,
      priorityCategories: ["beach", "food"],
    });
    const poolNames = new Set(pool.map((a) => a.name));
    const scheduled = days
      .flatMap((d) => d.items)
      .map((i) => i.title)
      .filter((title) => poolNames.has(title));
    expect(scheduled.length).toBeGreaterThan(0);
    expect(new Set(scheduled).size).toBe(scheduled.length);
  });

  it("still produces a usable plan with no activity data", () => {
    const days = generateItinerary({
      destination: goa,
      start: "2026-11-13",
      duration: 3,
      activities: [],
      priorityCategories: [],
    });
    expect(days).toHaveLength(3);
    expect(days.every((d) => d.items.length === 3)).toBe(true);
  });

  it("returns nothing for a zero-day trip rather than guessing", () => {
    expect(
      generateItinerary({
        destination: goa,
        start: "2026-11-13",
        duration: 0,
        activities: [],
        priorityCategories: [],
      }),
    ).toEqual([]);
  });
});
