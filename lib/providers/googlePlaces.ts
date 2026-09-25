import "server-only";
import { z } from "zod";
import { fetchJson, ProviderError } from "@/lib/http";
import { serverEnv } from "@/lib/env";
import type { Activity, ActivityCategory } from "@/types/activity";
import type { ActivityProvider, PlaceDetails, PlaceProvider, PlaceSuggestion } from "./types";

const BASE = "https://places.googleapis.com/v1";

const autocompleteSchema = z.object({
  suggestions: z
    .array(
      z.object({
        placePrediction: z
          .object({
            placeId: z.string(),
            text: z.object({ text: z.string() }).optional(),
            structuredFormat: z
              .object({
                mainText: z.object({ text: z.string() }).optional(),
                secondaryText: z.object({ text: z.string() }).optional(),
              })
              .optional(),
          })
          .optional(),
      }),
    )
    .optional()
    .default([]),
});

const detailsSchema = z.object({
  id: z.string(),
  displayName: z.object({ text: z.string() }).optional(),
  formattedAddress: z.string().optional(),
  location: z.object({ latitude: z.number(), longitude: z.number() }),
  addressComponents: z
    .array(z.object({ shortText: z.string().optional(), types: z.array(z.string()) }))
    .optional(),
});

const textSearchSchema = z.object({
  places: z
    .array(
      z.object({
        id: z.string(),
        displayName: z.object({ text: z.string() }).optional(),
        formattedAddress: z.string().optional(),
        location: z.object({ latitude: z.number(), longitude: z.number() }),
        rating: z.number().optional(),
        userRatingCount: z.number().optional(),
        photos: z.array(z.object({ name: z.string() })).optional(),
      }),
    )
    .optional()
    .default([]),
});

/** Search phrasing per category. Only categories the group cares about are queried. */
const CATEGORY_QUERIES: Record<ActivityCategory, string> = {
  adventure: "adventure activities and outdoor sports in",
  relaxed: "spas, quiet cafes and relaxing spots in",
  sightseeing: "top tourist attractions in",
  beach: "best beaches in",
  food: "best restaurants and local food in",
  nightlife: "bars and nightlife in",
  nature: "parks, waterfalls and nature spots in",
  culture: "museums, temples and cultural landmarks in",
  shopping: "markets and shopping areas in",
};

function key(): string {
  const value = serverEnv.googleMapsServerKey;
  if (!value) throw new ProviderError("google-places", "Google Places is not configured");
  return value;
}

export class GooglePlacesProvider implements PlaceProvider, ActivityProvider {
  readonly source = "google-places" as const;

  async autocomplete(input: string, kind: "city" | "destination"): Promise<PlaceSuggestion[]> {
    if (input.trim().length < 2) return [];
    const raw = await fetchJson(`${BASE}/places:autocomplete`, {
      provider: "google-places",
      method: "POST",
      headers: { "X-Goog-Api-Key": key() },
      body: {
        input: input.trim(),
        // Cities for origins; broader geography for destinations.
        includedPrimaryTypes: kind === "city" ? ["(cities)"] : ["(regions)"],
        languageCode: "en",
      },
      timeoutMs: 5000,
      retries: 0,
    });

    return autocompleteSchema.parse(raw).suggestions.flatMap((s) => {
      const p = s.placePrediction;
      if (!p) return [];
      return [
        {
          placeId: p.placeId,
          primaryText: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
          secondaryText: p.structuredFormat?.secondaryText?.text ?? null,
          description: p.text?.text ?? p.structuredFormat?.mainText?.text ?? "",
        },
      ];
    });
  }

  async details(placeId: string): Promise<PlaceDetails | null> {
    const raw = await fetchJson(`${BASE}/places/${encodeURIComponent(placeId)}`, {
      provider: "google-places",
      headers: {
        "X-Goog-Api-Key": key(),
        // Only the fields we use — field mask directly drives the bill.
        "X-Goog-FieldMask":
          "id,displayName,formattedAddress,location,addressComponents",
      },
      timeoutMs: 5000,
      retries: 1,
      next: { revalidate: 60 * 60 * 24 * 30 },
    });

    const place = detailsSchema.parse(raw);
    const country = place.addressComponents?.find((c) => c.types.includes("country"));
    return {
      placeId: place.id,
      name: place.displayName?.text ?? "",
      formattedAddress: place.formattedAddress ?? null,
      latitude: place.location.latitude,
      longitude: place.location.longitude,
      countryCode: country?.shortText ?? null,
    };
  }

  async searchActivities(
    destination: { name: string; latitude: number; longitude: number },
    category: ActivityCategory,
    limit: number,
  ): Promise<Activity[]> {
    const raw = await fetchJson(`${BASE}/places:searchText`, {
      provider: "google-places",
      method: "POST",
      headers: {
        "X-Goog-Api-Key": key(),
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.photos.name",
      },
      body: {
        textQuery: `${CATEGORY_QUERIES[category]} ${destination.name}`,
        maxResultCount: Math.min(limit, 10),
        languageCode: "en",
        locationBias: {
          circle: {
            center: { latitude: destination.latitude, longitude: destination.longitude },
            radius: 30_000,
          },
        },
      },
      timeoutMs: 7000,
      retries: 1,
      next: { revalidate: 60 * 60 * 24 * 7 },
    });

    return textSearchSchema
      .parse(raw)
      .places.slice(0, limit)
      .map((place) => ({
        id: place.id,
        name: place.displayName?.text ?? "Unnamed place",
        address: place.formattedAddress ?? null,
        rating: place.rating ?? null,
        userRatingCount: place.userRatingCount ?? null,
        placeId: place.id,
        latitude: place.location.latitude,
        longitude: place.location.longitude,
        category,
        photoUrl: place.photos?.[0]
          ? `/api/places/photo?name=${encodeURIComponent(place.photos[0].name)}`
          : null,
        source: "google-places" as const,
      }));
  }
}
