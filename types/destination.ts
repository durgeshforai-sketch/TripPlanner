import type { TripStyle } from "./preferences";

export type DestinationScope = "domestic" | "international";

export interface DestinationImage {
  url: string;
  width: number;
  height: number;
  credit: string;
  licence: string;
  source: string;
}

export interface Destination {
  id: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
  scope: DestinationScope;
  latitude: number;
  longitude: number;
  airportCodes: string[];
  tags: TripStyle[];
  description: string;
  typicalTripLength: { min: number; max: number };
  /**
   * Freely-licensed photograph of the place. Null means the UI falls back to
   * generated artwork. Attribution travels with the image because Commons
   * licences require credit wherever it is shown.
   */
  representativeImage: DestinationImage | null;
  regions: string[];
  /**
   * Indicative per-person on-ground cost per day in INR, excluding flights.
   * Used by the budget model; replaced by live pricing if a provider is added.
   */
  dailyCostINR: number;
  /** Things this destination cannot offer, matched against deal-breakers. */
  notableFor: string[];
}
