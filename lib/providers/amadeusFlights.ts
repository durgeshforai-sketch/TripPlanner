import "server-only";
import { z } from "zod";
import { fetchJson, ProviderError } from "@/lib/http";
import { serverEnv } from "@/lib/env";
import type { FlightOffer, FlightSearchParams } from "@/types/flight";
import type { FlightProvider } from "./types";

const BASE = "https://test.api.amadeus.com";

const tokenSchema = z.object({ access_token: z.string(), expires_in: z.number() });

const offersSchema = z.object({
  data: z
    .array(
      z.object({
        id: z.string(),
        price: z.object({ total: z.string(), currency: z.string() }),
        validatingAirlineCodes: z.array(z.string()).optional(),
        itineraries: z.array(
          z.object({
            duration: z.string().optional(),
            segments: z.array(
              z.object({
                carrierCode: z.string(),
                number: z.string().optional(),
                departure: z.object({ iataCode: z.string(), at: z.string() }),
                arrival: z.object({ iataCode: z.string(), at: z.string() }),
              }),
            ),
          }),
        ),
      }),
    )
    .optional()
    .default([]),
});

/**
 * Optional second adapter. It is never selected automatically — Amadeus
 * Self-Service credentials are not assumed to work, and the test environment
 * returns cached rather than live inventory.
 */
export class AmadeusFlightProvider implements FlightProvider {
  readonly source = "amadeus" as const;
  private token: { value: string; expiresAt: number } | null = null;

  private async accessToken(): Promise<string> {
    const { amadeusClientId, amadeusClientSecret } = serverEnv;
    if (!amadeusClientId || !amadeusClientSecret) {
      throw new ProviderError("amadeus", "Amadeus is not configured");
    }
    if (this.token && this.token.expiresAt > Date.now() + 30_000) return this.token.value;

    const response = await fetch(`${BASE}/v1/security/oauth2/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: amadeusClientId,
        client_secret: amadeusClientSecret,
      }),
      cache: "no-store",
    });
    if (!response.ok) throw new ProviderError("amadeus", "Could not authenticate with Amadeus");

    const parsed = tokenSchema.parse(await response.json());
    this.token = { value: parsed.access_token, expiresAt: Date.now() + parsed.expires_in * 1000 };
    return this.token.value;
  }

  async searchFlights(params: FlightSearchParams): Promise<FlightOffer[]> {
    const token = await this.accessToken();
    const query = new URLSearchParams({
      originLocationCode: params.originAirport,
      destinationLocationCode: params.destinationAirport,
      departureDate: params.departureDate,
      returnDate: params.returnDate,
      adults: String(params.passengers),
      travelClass: "ECONOMY",
      currencyCode: "INR",
      max: "10",
      ...(params.maxConnections !== undefined && params.maxConnections === 0
        ? { nonStop: "true" }
        : {}),
    });

    const raw = await fetchJson(`${BASE}/v2/shopping/flight-offers?${query.toString()}`, {
      provider: "amadeus",
      headers: { Authorization: `Bearer ${token}` },
      timeoutMs: 15_000,
      retries: 0,
    });

    return offersSchema
      .parse(raw)
      .data.map((offer) => {
        const outbound = offer.itineraries[0];
        if (!outbound || outbound.segments.length === 0) return null;
        const first = outbound.segments[0];
        const last = outbound.segments[outbound.segments.length - 1];
        const minutes = Math.round(
          (new Date(last.arrival.at).getTime() - new Date(first.departure.at).getTime()) / 60_000,
        );
        const flight: FlightOffer = {
          id: offer.id,
          origin: first.departure.iataCode,
          destination: last.arrival.iataCode,
          departureTime: first.departure.at,
          arrivalTime: last.arrival.at,
          durationMinutes: Number.isFinite(minutes) ? minutes : 0,
          stops: outbound.segments.length - 1,
          airline: offer.validatingAirlineCodes?.[0] ?? first.carrierCode,
          price: Number(offer.price.total),
          currency: offer.price.currency,
          segments: outbound.segments.map((segment) => ({
            airline: segment.carrierCode,
            airlineCode: segment.carrierCode,
            flightNumber: segment.number ?? null,
            departureAirport: segment.departure.iataCode,
            arrivalAirport: segment.arrival.iataCode,
            departureTime: segment.departure.at,
            arrivalTime: segment.arrival.at,
          })),
          source: "amadeus",
        };
        return flight;
      })
      .filter((offer): offer is FlightOffer => offer !== null)
      .sort((a, b) => a.price - b.price);
  }

  async getAirportSuggestions(): Promise<{ code: string; name: string; city: string }[]> {
    return [];
  }
}
