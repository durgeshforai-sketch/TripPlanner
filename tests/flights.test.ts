import { describe, expect, it } from "vitest";
import { DuffelFlightProvider } from "@/lib/providers/duffelFlights";
import { DemoFlightProvider } from "@/lib/providers/demo";

const provider = new DuffelFlightProvider();

const offer = {
  id: "off_123",
  total_amount: "18450.75",
  total_currency: "INR",
  owner: { name: "IndiGo" },
  slices: [
    {
      duration: "PT7H35M",
      segments: [
        {
          marketing_carrier: { name: "IndiGo", iata_code: "6E" },
          marketing_carrier_flight_number: "512",
          origin: { iata_code: "BLR" },
          destination: { iata_code: "BOM" },
          departing_at: "2026-11-13T06:00:00",
          arriving_at: "2026-11-13T07:50:00",
        },
        {
          marketing_carrier: { name: "IndiGo", iata_code: "6E" },
          marketing_carrier_flight_number: "77",
          origin: { iata_code: "BOM" },
          destination: { iata_code: "DPS" },
          departing_at: "2026-11-13T09:40:00",
          arriving_at: "2026-11-13T13:35:00",
        },
      ],
    },
    { duration: "PT8H", segments: [] },
  ],
};

describe("flight normalisation", () => {
  it("maps a provider offer onto our internal shape", () => {
    const normalised = provider.normalizeOffer(offer);
    expect(normalised).not.toBeNull();
    expect(normalised?.origin).toBe("BLR");
    expect(normalised?.destination).toBe("DPS");
    expect(normalised?.price).toBe(18450.75);
    expect(normalised?.currency).toBe("INR");
    expect(normalised?.airline).toBe("IndiGo");
    expect(normalised?.source).toBe("duffel");
  });

  it("counts stops from the outbound segments", () => {
    expect(provider.normalizeOffer(offer)?.stops).toBe(1);
  });

  it("prefers the provider's own duration over a computed one", () => {
    expect(provider.normalizeOffer(offer)?.durationMinutes).toBe(7 * 60 + 35);
  });

  it("computes a duration when the provider omits it", () => {
    const withoutDuration = {
      ...offer,
      slices: [{ ...offer.slices[0], duration: null }, offer.slices[1]],
    };
    expect(provider.normalizeOffer(withoutDuration)?.durationMinutes).toBe(7 * 60 + 35);
  });

  it("returns null for an offer with no usable outbound slice", () => {
    expect(provider.normalizeOffer({ ...offer, slices: [] })).toBeNull();
  });

  it("keeps every segment for the detail view", () => {
    const normalised = provider.normalizeOffer(offer);
    expect(normalised?.segments).toHaveLength(2);
    expect(normalised?.segments[1].arrivalAirport).toBe("DPS");
  });
});

describe("demo flights", () => {
  const demo = new DemoFlightProvider();
  const params = {
    originAirport: "BLR",
    destinationAirport: "GOX",
    departureDate: "2026-11-13",
    returnDate: "2026-11-16",
    passengers: 5,
  };

  it("is deterministic for the same search", async () => {
    const [first, second] = await Promise.all([
      demo.searchFlights(params),
      demo.searchFlights(params),
    ]);
    expect(first).toEqual(second);
  });

  it("labels itself as demo data", async () => {
    const offers = await demo.searchFlights(params);
    expect(offers.every((o) => o.source === "demo")).toBe(true);
  });

  it("returns cheapest first", async () => {
    const offers = await demo.searchFlights(params);
    const prices = offers.map((o) => o.price);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
  });

  it("returns nothing when origin and destination are the same", async () => {
    expect(await demo.searchFlights({ ...params, destinationAirport: "BLR" })).toEqual([]);
  });

  it("prices a long international route above a short domestic one", async () => {
    const domestic = await demo.searchFlights(params);
    const international = await demo.searchFlights({ ...params, destinationAirport: "LIS" });
    expect(international[0].price).toBeGreaterThan(domestic[0].price);
  });
});
