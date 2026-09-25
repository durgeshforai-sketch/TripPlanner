import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchJson } from "@/lib/http";
import { getHolidays } from "@/lib/providers/holidays";
import { findLongWeekends } from "@/lib/holidays/longWeekends";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("holiday sourcing", () => {
  it("uses the curated national list where we have one", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await getHolidays("IN", 2026);
    expect(result.source).toBe("curated");
    expect(result.degraded).toBe(false);
    // No network call is needed when the year is curated.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.holidays.find((h) => h.date === "2026-11-08")?.name).toBe("Diwali");
    expect(result.holidays.find((h) => h.date === "2026-10-02")?.name).toBe("Gandhi Jayanti");
  });

  it("treats a 204 from the API as no data, not as a failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(fetchJson("https://example.test", { provider: "test" })).resolves.toBeNull();
  });

  it("falls back to fixed dates for a country the API does not cover", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    const result = await getHolidays("IN", 2033);
    expect(result.source).toBe("local");
    expect(result.degraded).toBe(true);
    expect(result.holidays.some((h) => h.date === "2033-01-26")).toBe(true);
  });

  it("uses the live API for a country it does cover", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify([
            { date: "2034-12-25", localName: "Christmas", name: "Christmas", countryCode: "PT" },
          ]),
          { status: 200 },
        ),
      ),
    );
    const result = await getHolidays("PT", 2034);
    expect(result.source).toBe("nager");
    expect(result.degraded).toBe(false);
  });
});

describe("long weekends from real Indian holidays", () => {
  it("finds the Gandhi Jayanti weekend in 2026", async () => {
    const { holidays } = await getHolidays("IN", 2026);
    const windows = findLongWeekends(holidays, { from: "2026-10-01", to: "2026-10-31" });
    // 2 Oct 2026 is a Friday, so it runs into the weekend.
    const window = windows.find((w) => w.start === "2026-10-02");
    expect(window?.days).toBe(3);
    expect(window?.holidays[0].name).toBe("Gandhi Jayanti");
  });

  it("suggests a bridge day around Dussehra 2026", async () => {
    const { holidays } = await getHolidays("IN", 2026);
    const windows = findLongWeekends(holidays, { from: "2026-10-01", to: "2026-10-31" });
    // Dussehra falls on Tuesday 20 Oct, so Monday 19th bridges the weekend.
    const bridged = windows.find((w) => w.bridgeDays.includes("2026-10-19"));
    expect(bridged?.days).toBe(4);
    expect(bridged?.label).toContain("Monday");
  });
});
