import type { TransportMode, TransportOption } from "@/types/transport";

/**
 * Planning estimates for getting to a destination.
 *
 * Every figure here is a model, not a quote, and is labelled "estimated" in the
 * UI. The rates live in one place so they can be tuned without touching the
 * logic that chooses between modes.
 */
export const TRANSPORT_RATES = {
  drive: {
    /** Fuel plus tolls, per kilometre, for a shared car. */
    costPerKm: 9,
    /** Costs are split, so a full car is much cheaper per head. */
    assumedOccupancy: 4,
    averageKmPerHour: 50,
    /** Breaks, food and traffic on top of moving time. */
    overheadHours: 0.75,
  },
  train: {
    costPerKm: 1.9,
    baseCost: 150,
    averageKmPerHour: 55,
    /** Rail routes wander compared with roads. */
    distanceFactor: 1.15,
    /** Getting to the station, waiting, and out the other end. */
    overheadHours: 2,
  },
  bus: {
    costPerKm: 1.6,
    baseCost: 80,
    averageKmPerHour: 45,
    distanceFactor: 1.05,
    overheadHours: 1.25,
  },
  fly: {
    /** Check-in, security, boarding, baggage and airport transfers. */
    overheadHours: 3.5,
    cruiseKmPerHour: 780,
  },
  /**
   * What an hour of travelling is worth giving up, per person. It is what lets
   * a 5-hour flight beat a 24-hour bus that costs half as much, without needing
   * arbitrary rules about how much extra is "allowed".
   */
  timeValuePerHour: 250,
} as const;

export const ROAD_THRESHOLDS = {
  /**
   * Below this, flying is a false economy once airport time and transfers are
   * counted, so road options lead and flights are marked as not sensible.
   */
  roadFirstKm: 300,
  /** Beyond this, surface travel eats the trip itself. */
  roadMaxKm: 1200,
  /** Trains and buses past this many hours are overnight journeys. */
  overnightHours: 8,
  /** Below this, flying is almost never worth it at all. */
  flyPointlessKm: 250,
} as const;

const round = (value: number, step: number): number => Math.round(value / step) * step;

export function driveOption(roadKm: number, occupancy?: number): TransportOption {
  const people = occupancy ?? TRANSPORT_RATES.drive.assumedOccupancy;
  const rate = TRANSPORT_RATES.drive;
  const hours = roadKm / rate.averageKmPerHour + rate.overheadHours;
  const perPerson = (roadKm * 2 * rate.costPerKm) / Math.max(1, people);

  return {
    mode: "drive",
    durationHours: Number(hours.toFixed(1)),
    distanceKm: roadKm,
    costPerPerson: round(perPerson, 50),
    costBasis: "estimated",
    overnight: false,
    note:
      people > 1 ? `Fuel and tolls split between ${people} people` : "Fuel and tolls for one car",
    sensible: roadKm <= ROAD_THRESHOLDS.roadMaxKm,
  };
}

export function trainOption(roadKm: number): TransportOption {
  const rate = TRANSPORT_RATES.train;
  const railKm = roadKm * rate.distanceFactor;
  const hours = railKm / rate.averageKmPerHour + rate.overheadHours;
  const perPerson = (rate.baseCost + railKm * rate.costPerKm) * 2;

  return {
    mode: "train",
    durationHours: Number(hours.toFixed(1)),
    distanceKm: Math.round(railKm),
    costPerPerson: round(perPerson, 50),
    costBasis: "estimated",
    overnight: hours >= ROAD_THRESHOLDS.overnightHours,
    note: "Air-conditioned sleeper class, return",
    sensible: roadKm <= ROAD_THRESHOLDS.roadMaxKm,
  };
}

export function busOption(roadKm: number): TransportOption {
  const rate = TRANSPORT_RATES.bus;
  const busKm = roadKm * rate.distanceFactor;
  const hours = busKm / rate.averageKmPerHour + rate.overheadHours;
  const perPerson = (rate.baseCost + busKm * rate.costPerKm) * 2;
  const overnight = hours >= ROAD_THRESHOLDS.overnightHours;

  return {
    mode: "bus",
    durationHours: Number(hours.toFixed(1)),
    distanceKm: Math.round(busKm),
    costPerPerson: round(perPerson, 50),
    costBasis: "estimated",
    overnight,
    note: overnight ? "Overnight sleeper coach, return" : "Seater coach, return",
    sensible: roadKm <= ROAD_THRESHOLDS.roadMaxKm,
  };
}

export function flightOption(input: {
  straightLineKm: number;
  roadKm: number | null;
  costPerPerson: number;
  costBasis: "live" | "estimated";
  flyingMinutes?: number | null;
}): TransportOption {
  const rate = TRANSPORT_RATES.fly;
  const flying =
    input.flyingMinutes != null
      ? input.flyingMinutes / 60
      : input.straightLineKm / rate.cruiseKmPerHour;
  const hours = flying + rate.overheadHours;

  // Short hops lose their speed advantage to airports and transfers.
  const reference = input.roadKm ?? input.straightLineKm;
  const sensible = reference > ROAD_THRESHOLDS.flyPointlessKm;

  return {
    mode: "fly",
    durationHours: Number(hours.toFixed(1)),
    distanceKm: Math.round(input.straightLineKm),
    costPerPerson: round(input.costPerPerson, 50),
    costBasis: input.costBasis,
    overnight: false,
    note: sensible
      ? "Return economy, including airport time"
      : "Airport time alone costs more than the drive saves",
    sensible,
  };
}

/**
 * What an option really costs: money plus the value of the time it consumes,
 * counted both ways. A cheap overnight bus is not cheap if it eats two days.
 */
export function generalisedCost(option: TransportOption): number {
  return option.costPerPerson + option.durationHours * 2 * TRANSPORT_RATES.timeValuePerHour;
}

/**
 * Picks the mode we would actually suggest.
 *
 * Under the road-first distance the answer is always a surface option: a short
 * flight costs more and, once airport time is counted, is not even faster.
 * Beyond that, the winner is whichever option costs least once travelling time
 * is priced in.
 */
export function recommendMode(
  options: TransportOption[],
  roadKm: number | null,
  allowedModes: TransportMode[] = ["fly", "train", "bus", "drive"],
): TransportMode | null {
  const allowed = new Set(allowedModes);
  const permitted = options.filter((option) => allowed.has(option.mode));
  if (permitted.length === 0) return null;

  // "Not sensible" is our opinion; "not allowed" is the group's constraint.
  // If a group will only fly, we still tell them to fly on a short hop — with
  // the option flagged as a poor idea — rather than leaving them with nothing.
  const sensible = permitted.filter((option) => option.sensible);
  const usable = sensible.length > 0 ? sensible : permitted;

  const pool = isRoadFirst(roadKm)
    ? usable.filter((option) => option.mode !== "fly")
    : usable;
  const candidates = pool.length > 0 ? pool : usable;

  return [...candidates].sort((a, b) => generalisedCost(a) - generalisedCost(b))[0].mode;
}

export function isRoadFirst(roadKm: number | null): boolean {
  return roadKm !== null && roadKm <= ROAD_THRESHOLDS.roadFirstKm;
}

/**
 * A destination served by the traveller's own airport is a drive, not a flight.
 * Coorg lists Bengaluru as its airport, so a Bengaluru group flying there would
 * be boarding a plane to the city they started in.
 */
export function shouldOfferFlight(
  originAirportCode: string | null,
  destinationAirportCodes: string[],
): boolean {
  if (!originAirportCode || destinationAirportCodes.length === 0) return false;
  return !destinationAirportCodes.includes(originAirportCode);
}

/**
 * Airfare must come from the flight model.
 *
 * The general travel estimate returns a *shared road cost* for short domestic
 * hops, and feeding that in produced a ₹1,550 "flight" that undercut driving.
 */
export function estimateAirfare(input: {
  straightLineKm: number;
  international: boolean;
  rates: {
    domesticBaseINR: number;
    domesticPerKm: number;
    internationalBaseINR: number;
    internationalPerKm: number;
  };
}): number {
  const base = input.international
    ? input.rates.internationalBaseINR
    : input.rates.domesticBaseINR;
  const perKm = input.international
    ? input.rates.internationalPerKm
    : input.rates.domesticPerKm;
  return Math.round(base + input.straightLineKm * perKm);
}
