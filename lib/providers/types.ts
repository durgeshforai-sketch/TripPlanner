import type { Activity, ActivityCategory } from "@/types/activity";
import type { FlightOffer, FlightSearchParams } from "@/types/flight";

export interface PlaceSuggestion {
  placeId: string;
  primaryText: string;
  secondaryText: string | null;
  description: string;
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  formattedAddress: string | null;
  latitude: number;
  longitude: number;
  countryCode: string | null;
}

export interface PlaceProvider {
  readonly source: "google-places" | "osm" | "demo";
  autocomplete(input: string, kind: "city" | "destination"): Promise<PlaceSuggestion[]>;
  details(placeId: string): Promise<PlaceDetails | null>;
}

export interface RouteLeg {
  distanceKm: number;
  durationMinutes: number;
}

export interface RouteProvider {
  readonly source: "google-routes" | "osrm" | "demo";
  drive(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
  ): Promise<RouteLeg | null>;
}

export interface FlightProvider {
  readonly source: "duffel" | "amadeus" | "demo";
  searchFlights(params: FlightSearchParams): Promise<FlightOffer[]>;
  getAirportSuggestions(query: string): Promise<{ code: string; name: string; city: string }[]>;
}

export interface ActivityProvider {
  readonly source: "google-places" | "osm" | "demo";
  searchActivities(
    destination: { name: string; latitude: number; longitude: number },
    category: ActivityCategory,
    limit: number,
  ): Promise<Activity[]>;
}

export interface Holiday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
}

export interface HolidayProvider {
  readonly source: "nager" | "local";
  getHolidays(countryCode: string, year: number): Promise<Holiday[]>;
}
