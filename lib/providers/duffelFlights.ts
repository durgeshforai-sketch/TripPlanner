import "server-only";
import { z } from "zod";
import { fetchJson, ProviderError } from "@/lib/http";
import { serverEnv } from "@/lib/env";
import type { FlightOffer, FlightSearchParams } from "@/types/flight";
import type { FlightProvider } from "./types";

const BASE = "https://api.duffel.com";

const segmentSchema = z.object({
  operating_carrier: z.object({ name: z.string(), iata_code: z.string().nullable() }).optional(),
  marketing_carrier: z.object({ name: z.string(), iata_code: z.string().nullable() }).optional(),
  marketing_carrier_flight_number: z.string().nullable().optional(),
  origin: z.object({ iata_code: z.string().nullable() }),
  destination: z.object({ iata_code: z.string().nullable() }),
  departing_at: z.string(),
  arriving_at: z.string(),
});

const offerSchema = z.object({
  id: z.string(),
  total_amount: z.string(),
  total_currency: z.string(),
  owner: z.object({ name: z.string() }).optional(),
  slices: z.array(
    z.object({
      duration: z.string().nullable().optional(),
      segments: z.array(segmentSchema),
    }),
  ),
});

const offerRequestSchema = z.object({
  data: z.object({ offers: z.array(offerSchema).optional().default([]) }),
});

const suggestionsSchema = z.object({
  data: z.array(
    z.object({
      type: z.string(),
      iata_code: z.string().nullable(),
      name: z.string(),
      city_name: z.string().nullable().optional(),
    }),
  ),
});

/** ISO 8601 duration such as `PT7H35M`. */
function parseIsoDuration(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/.exec(value);
  if (!match) return null;
  const [, d, h, m] = match;
  const minutes = Number(d ?? 0) * 1440 + Number(h ?? 0) * 60 + Number(m ?? 0);
  return minutes > 0 ? minutes : null;
}

export class DuffelFlightProvider implements FlightProvider {
  readonly source = "duffel" as const;

  private headers(): Record<string, string> {
    const token = serverEnv.duffelToken;
    if (!token) throw new ProviderError("duffel", "Duffel is not configured");
    return {
      Authorization: `Bearer ${token}`,
      "Duffel-Version": "v2",
      Accept: "application/json",
    };
  }

  async searchFlights(params: FlightSearchParams): Promise<FlightOffer[]> {
    const raw = await fetchJson(`${BASE}/air/offer_requests?return_offers=true`, {
      provider: "duffel",
      method: "POST",
      headers: this.headers(),
      body: {
        data: {
          slices: [
            {
              origin: params.originAirport,
              destination: params.destinationAirport,
              departure_date: params.departureDate,
            },
            {
              origin: params.destinationAirport,
              destination: params.originAirport,
              departure_date: params.returnDate,
            },
          ],
          passengers: Array.from({ length: params.passengers }, () => ({ type: "adult" })),
          cabin_class: "economy",
          ...(params.maxConnections !== undefined
            ? { max_connections: params.maxConnections }
            : {}),
        },
      },
      timeoutMs: 15_000,
      retries: 0,
    });

    return offerRequestSchema
      .parse(raw)
      .data.offers.map((offer) => this.normalizeOffer(offer))
      .filter((offer): offer is FlightOffer => offer !== null)
      .sort((a, b) => a.price - b.price);
  }

  /** Duffel's shape -> our internal FlightOffer. Outbound slice only for display. */
  normalizeOffer(offer: z.infer<typeof offerSchema>): FlightOffer | null {
    const outbound = offer.slices[0];
    if (!outbound || outbound.segments.length === 0) return null;

    const first = outbound.segments[0];
    const last = outbound.segments[outbound.segments.length - 1];
    const carrier = first.marketing_carrier ?? first.operating_carrier;

    const explicit = parseIsoDuration(outbound.duration);
    const computed = Math.round(
      (new Date(last.arriving_at).getTime() - new Date(first.departing_at).getTime()) / 60_000,
    );

    return {
      id: offer.id,
      origin: first.origin.iata_code ?? "",
      destination: last.destination.iata_code ?? "",
      departureTime: first.departing_at,
      arrivalTime: last.arriving_at,
      durationMinutes: explicit ?? (Number.isFinite(computed) ? computed : 0),
      stops: outbound.segments.length - 1,
      airline: offer.owner?.name ?? carrier?.name ?? "Airline",
      price: Number(offer.total_amount),
      currency: offer.total_currency,
      segments: outbound.segments.map((segment) => {
        const sc = segment.marketing_carrier ?? segment.operating_carrier;
        return {
          airline: sc?.name ?? "Airline",
          airlineCode: sc?.iata_code ?? "",
          flightNumber: segment.marketing_carrier_flight_number ?? null,
          departureAirport: segment.origin.iata_code ?? "",
          arrivalAirport: segment.destination.iata_code ?? "",
          departureTime: segment.departing_at,
          arrivalTime: segment.arriving_at,
        };
      }),
      source: "duffel",
    };
  }

  async getAirportSuggestions(
    query: string,
  ): Promise<{ code: string; name: string; city: string }[]> {
    if (query.trim().length < 2) return [];
    const raw = await fetchJson(
      `${BASE}/places/suggestions?query=${encodeURIComponent(query.trim())}`,
      { provider: "duffel", headers: this.headers(), timeoutMs: 6000, retries: 1 },
    );
    return suggestionsSchema
      .parse(raw)
      .data.filter((place) => place.type === "airport" && place.iata_code)
      .map((place) => ({
        code: place.iata_code ?? "",
        name: place.name,
        city: place.city_name ?? place.name,
      }));
  }
}
