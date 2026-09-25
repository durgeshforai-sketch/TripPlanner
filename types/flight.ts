export interface FlightSegment {
  airline: string;
  airlineCode: string;
  flightNumber: string | null;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
}

export interface FlightOffer {
  id: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  /** Total journey minutes including layovers. */
  durationMinutes: number;
  stops: number;
  airline: string;
  price: number;
  currency: string;
  segments: FlightSegment[];
  source: "duffel" | "amadeus" | "demo";
}

export interface OriginFlightSummary {
  originCity: string;
  originAirport: string | null;
  memberIds: string[];
  cheapest: FlightOffer | null;
  /** Null when the provider returned nothing or failed for this origin. */
  error: string | null;
}

export interface FlightSummary {
  perOrigin: OriginFlightSummary[];
  estimatedMinimumFlightCost: number | null;
  estimatedAverageFlightCost: number | null;
  estimatedMaximumFlightCost: number | null;
  currency: string;
  checkedAt: string;
  source: "duffel" | "amadeus" | "demo" | "unavailable";
}

export interface FlightSearchParams {
  originAirport: string;
  destinationAirport: string;
  departureDate: string;
  returnDate: string;
  passengers: number;
  maxConnections?: number;
}
