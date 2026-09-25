import { describe, expect, it } from "vitest";
import {
  busOption,
  driveOption,
  flightOption,
  isRoadFirst,
  estimateAirfare,
  recommendMode,
  ROAD_THRESHOLDS,
  shouldOfferFlight,
  trainOption,
} from "@/lib/transport/model";

/** Bengaluru to Mysuru is the canonical short hop nobody should fly. */
const SHORT_KM = 145;
/** Bengaluru to Goa — far enough that flying starts to make sense. */
const MEDIUM_KM = 560;
/** Bengaluru to Delhi — surface travel is a two-day commitment. */
const LONG_KM = 2100;

describe("road options", () => {
  it("splits driving costs across the car", () => {
    const solo = driveOption(SHORT_KM, 1);
    const shared = driveOption(SHORT_KM, 4);
    expect(shared.costPerPerson).toBeLessThan(solo.costPerPerson);
    expect(shared.note).toContain("4 people");
  });

  it("prices a train below a flight for a short hop", () => {
    const train = trainOption(SHORT_KM);
    const fly = flightOption({
      straightLineKm: SHORT_KM,
      roadKm: SHORT_KM,
      costPerPerson: 6000,
      costBasis: "estimated",
    });
    expect(train.costPerPerson).toBeLessThan(fly.costPerPerson);
  });

  it("marks long coach journeys as overnight", () => {
    expect(busOption(SHORT_KM).overnight).toBe(false);
    const long = busOption(700);
    expect(long.durationHours).toBeGreaterThan(ROAD_THRESHOLDS.overnightHours);
    expect(long.overnight).toBe(true);
    expect(long.note).toContain("Overnight");
  });

  it("stops treating surface travel as sensible past the limit", () => {
    expect(trainOption(MEDIUM_KM).sensible).toBe(true);
    expect(trainOption(LONG_KM).sensible).toBe(false);
    expect(busOption(LONG_KM).sensible).toBe(false);
  });
});

describe("flights over short distances", () => {
  it("is marked not sensible below the pointless threshold", () => {
    const fly = flightOption({
      straightLineKm: SHORT_KM,
      roadKm: SHORT_KM,
      costPerPerson: 5500,
      costBasis: "estimated",
    });
    expect(fly.sensible).toBe(false);
    expect(fly.note).toContain("Airport time");
  });

  it("counts airport time, so a short flight is not actually quick", () => {
    const fly = flightOption({
      straightLineKm: SHORT_KM,
      roadKm: SHORT_KM,
      costPerPerson: 5500,
      costBasis: "estimated",
    });
    expect(fly.durationHours).toBeGreaterThan(driveOption(SHORT_KM).durationHours);
  });

  it("becomes sensible over longer distances", () => {
    expect(
      flightOption({
        straightLineKm: MEDIUM_KM,
        roadKm: MEDIUM_KM,
        costPerPerson: 7000,
        costBasis: "estimated",
      }).sensible,
    ).toBe(true);
  });
});

describe("choosing a mode", () => {
  const optionsFor = (roadKm: number, fare: number) => [
    driveOption(roadKm),
    trainOption(roadKm),
    busOption(roadKm),
    flightOption({
      straightLineKm: roadKm * 0.85,
      roadKm,
      costPerPerson: fare,
      costBasis: "estimated",
    }),
  ];

  it("never suggests flying under 300 km", () => {
    for (const km of [80, 145, 220, 299]) {
      expect(isRoadFirst(km)).toBe(true);
      expect(recommendMode(optionsFor(km, 5000), km)).not.toBe("fly");
    }
  });

  it("will suggest flying once the distance justifies it", () => {
    expect(recommendMode(optionsFor(LONG_KM, 9000), LONG_KM)).toBe("fly");
  });

  it("respects the modes a group is willing to use", () => {
    const km = 200;
    expect(recommendMode(optionsFor(km, 5000), km, ["train"])).toBe("train");
    expect(recommendMode(optionsFor(km, 5000), km, ["bus"])).toBe("bus");
  });

  it("falls back to flying when no surface mode is allowed", () => {
    expect(recommendMode(optionsFor(200, 5000), 200, ["fly"])).toBe("fly");
  });

  it("returns nothing when every mode is ruled out", () => {
    expect(recommendMode([], 200)).toBeNull();
  });

  it("pays a little more to save a lot of time on a long trip", () => {
    const km = 1000;
    const chosen = recommendMode(optionsFor(km, 6500), km);
    // The train is cheaper but takes 20 hours; the flight is barely dearer.
    expect(chosen).toBe("fly");
  });
});

describe("offering a flight at all", () => {
  it("does not fly you to the airport you started from", () => {
    // Coorg lists Bengaluru as its airport.
    expect(shouldOfferFlight("BLR", ["BLR", "MYQ"])).toBe(false);
  });

  it("offers a flight when the destination has its own airport", () => {
    expect(shouldOfferFlight("BLR", ["GOX", "GOI"])).toBe(true);
  });

  it("offers nothing when we do not know the origin airport", () => {
    expect(shouldOfferFlight(null, ["GOX"])).toBe(false);
    expect(shouldOfferFlight("BLR", [])).toBe(false);
  });
});

describe("airfare estimates", () => {
  const rates = {
    domesticBaseINR: 4200,
    domesticPerKm: 4.4,
    internationalBaseINR: 9000,
    internationalPerKm: 3.6,
  };

  it("never prices a flight below the cost of driving there", () => {
    const km = 252;
    const fare = estimateAirfare({ straightLineKm: km, international: false, rates });
    // The bug this guards: an airfare taken from the road model came out at
    // ₹1,550, cheaper than the drive it was supposed to be an alternative to.
    expect(fare).toBeGreaterThan(driveOption(km).costPerPerson);
  });

  it("scales with distance", () => {
    const short = estimateAirfare({ straightLineKm: 300, international: false, rates });
    const long = estimateAirfare({ straightLineKm: 1800, international: false, rates });
    expect(long).toBeGreaterThan(short * 2);
  });

  it("uses the international rate abroad", () => {
    const domestic = estimateAirfare({ straightLineKm: 1000, international: false, rates });
    const abroad = estimateAirfare({ straightLineKm: 1000, international: true, rates });
    expect(abroad).toBeGreaterThan(domestic);
  });
});
