import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchJson, mapWithConcurrency, ProviderError } from "@/lib/http";
import { getHolidays } from "@/lib/providers/holidays";
import { loadFlights } from "@/lib/recommendation/enrich";
import { getDestination } from "@/data/destinations";
import { getAirport } from "@/data/airports";
import type { Destination } from "@/types/destination";

const goa = getDestination("goa") as Destination;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("outbound requests", () => {
  it("retries a transient failure and succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: 1 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchJson("https://example.test", { provider: "test" })).resolves.toEqual({
      ok: 1,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a client error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("nope", { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchJson("https://example.test", { provider: "test" })).rejects.toBeInstanceOf(
      ProviderError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("never leaks the provider's response body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("secret=abc123", { status: 401 })),
    );
    await expect(
      fetchJson("https://example.test", { provider: "test", retries: 0 }),
    ).rejects.toThrow(/test responded with 401/);
  });

  it("gives up on a hanging request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        (_url: string, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
            );
          }),
      ),
    );
    await expect(
      fetchJson("https://example.test", { provider: "test", timeoutMs: 20, retries: 0 }),
    ).rejects.toThrow(/timed out/);
  });
});

describe("bounded concurrency", () => {
  it("never runs more than the limit at once", async () => {
    let active = 0;
    let peak = 0;
    const results = await mapWithConcurrency([1, 2, 3, 4, 5, 6, 7, 8], 3, async (value) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return value * 2;
    });
    expect(peak).toBeLessThanOrEqual(3);
    expect(results).toHaveLength(8);
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
  });

  it("isolates one failure from the rest", async () => {
    const results = await mapWithConcurrency([1, 2, 3], 2, async (value) => {
      if (value === 2) throw new Error("boom");
      return value;
    });
    expect(results.map((r) => r.status)).toEqual(["fulfilled", "rejected", "fulfilled"]);
  });
});

describe("degrading instead of failing", () => {
  it("falls back to the offline holiday list when the API is down", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    // A year no other test warms the cache with.
    const result = await getHolidays("IN", 2031);
    expect(result.source).toBe("local");
    expect(result.degraded).toBe(true);
    expect(result.holidays.length).toBeGreaterThan(0);
  });

  it("keeps the destination usable when every flight lookup fails", async () => {
    const origins = [
      {
        memberIds: ["m1"],
        city: "Bengaluru",
        latitude: 12.97,
        longitude: 77.59,
        airport: getAirport("BLR") ?? null,
      },
    ];
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("provider down")));

    const summary = await loadFlights(
      goa,
      origins,
      { start: "2026-11-13", end: "2026-11-16" },
      new Map([["Bengaluru", 1]]),
    );
    expect(summary.perOrigin).toHaveLength(1);
    expect(summary.checkedAt).toBeTruthy();
    // Demo mode is on in tests, so this still resolves; the shape must hold
    // either way and must never throw.
    expect(summary).toHaveProperty("estimatedMinimumFlightCost");
  });

  it("reports honestly when there is no origin it can search from", async () => {
    const summary = await loadFlights(
      goa,
      [{ memberIds: ["m1"], city: "Nowhere", latitude: null, longitude: null, airport: null }],
      { start: "2026-11-13", end: "2026-11-16" },
      new Map(),
    );
    expect(summary.source).toBe("unavailable");
    expect(summary.perOrigin).toEqual([]);
    expect(summary.estimatedMinimumFlightCost).toBeNull();
  });
});

describe("busy free services", () => {
  it("stops asking Overpass for a while once both mirrors have failed", async () => {
    const { OsmActivityProvider, resetOverpassCoolOff } = await import(
      "@/lib/providers/osm/activities"
    );
    resetOverpassCoolOff();
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);
    const provider = new OsmActivityProvider();

    await expect(provider.searchActivities(goa, "beach", 4)).rejects.toBeInstanceOf(ProviderError);
    const callsForFirstLookup = fetchMock.mock.calls.length;
    expect(callsForFirstLookup).toBeGreaterThan(0);

    // The next category fails fast instead of spending the run's time budget.
    await expect(provider.searchActivities(goa, "food", 4)).rejects.toThrow(/cooling off/);
    expect(fetchMock).toHaveBeenCalledTimes(callsForFirstLookup);

    resetOverpassCoolOff();
  });
});
