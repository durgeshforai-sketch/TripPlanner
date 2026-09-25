import "server-only";
import { z } from "zod";
import { fetchJson } from "@/lib/http";
import type { PlaceDetails, PlaceProvider, PlaceSuggestion } from "../types";

/** Courtesy requirement of the OSM services; they block generic agents. */
export const OSM_USER_AGENT =
  "Tripsync/1.0 (group trip planning; https://github.com/tripsync)";

const photonSchema = z.object({
  features: z
    .array(
      z.object({
        geometry: z.object({ coordinates: z.tuple([z.number(), z.number()]) }),
        properties: z.object({
          osm_id: z.number().optional(),
          osm_type: z.string().optional(),
          name: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          country: z.string().optional(),
          countrycode: z.string().optional(),
          type: z.string().optional(),
        }),
      }),
    )
    .default([]),
});

const nominatimSchema = z.array(
  z.object({
    place_id: z.number(),
    lat: z.string(),
    lon: z.string(),
    display_name: z.string(),
    name: z.string().optional(),
    address: z.object({ country_code: z.string().optional() }).optional(),
  }),
);

/**
 * Free, keyless place lookup built on OpenStreetMap.
 *
 * Photon (Komoot) handles type-ahead because it is fast and tolerant of partial
 * words; Nominatim resolves a chosen suggestion. Both are community-run, so
 * calls are cached hard and failures degrade rather than break the form.
 */
export class OsmPlaceProvider implements PlaceProvider {
  readonly source = "osm" as const;

  async autocomplete(input: string, kind: "city" | "destination"): Promise<PlaceSuggestion[]> {
    const query = input.trim();
    if (query.length < 2) return [];

    const params = new URLSearchParams({ q: query, limit: "6", lang: "en" });
    // Photon layers keep city search from filling up with shops and streets.
    if (kind === "city") {
      params.append("layer", "city");
      params.append("layer", "district");
    } else {
      params.append("layer", "city");
      params.append("layer", "district");
      params.append("layer", "state");
      params.append("layer", "county");
    }

    const raw = await fetchJson(`https://photon.komoot.io/api/?${params.toString()}`, {
      provider: "photon",
      headers: { "User-Agent": OSM_USER_AGENT },
      timeoutMs: 6000,
      retries: 1,
      next: { revalidate: 60 * 60 * 24 * 7 },
    });

    const seen = new Set<string>();
    return photonSchema
      .parse(raw)
      .features.flatMap((feature) => {
        const p = feature.properties;
        const name = p.name;
        if (!name) return [];

        const where = [p.state, p.country].filter(Boolean).join(", ");
        const key = `${name}|${where}`.toLowerCase();
        if (seen.has(key)) return [];
        seen.add(key);

        const [longitude, latitude] = feature.geometry.coordinates;
        return [
          {
            // Coordinates travel in the id so choosing a place needs no second call.
            placeId: `osm:${latitude.toFixed(5)},${longitude.toFixed(5)}:${encodeURIComponent(name)}:${p.countrycode ?? ""}`,
            primaryText: name,
            secondaryText: where || null,
            description: where ? `${name}, ${where}` : name,
          },
        ];
      })
      .slice(0, 6);
  }

  async details(placeId: string): Promise<PlaceDetails | null> {
    // Suggestions already carry their coordinates, so this is usually free.
    if (placeId.startsWith("osm:")) {
      const [, coords, name, country] = placeId.split(":");
      const [latitude, longitude] = (coords ?? "").split(",").map(Number);
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return {
          placeId,
          name: decodeURIComponent(name ?? ""),
          formattedAddress: null,
          latitude,
          longitude,
          countryCode: country ? country.toUpperCase() : null,
        };
      }
    }

    const raw = await fetchJson(
      `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
        q: placeId,
        format: "json",
        limit: "1",
        addressdetails: "1",
      }).toString()}`,
      {
        provider: "nominatim",
        headers: { "User-Agent": OSM_USER_AGENT },
        timeoutMs: 6000,
        retries: 1,
        next: { revalidate: 60 * 60 * 24 * 30 },
      },
    );

    const match = nominatimSchema.parse(raw)[0];
    if (!match) return null;

    return {
      placeId: `osm-place:${match.place_id}`,
      name: match.name ?? match.display_name.split(",")[0],
      formattedAddress: match.display_name,
      latitude: Number(match.lat),
      longitude: Number(match.lon),
      countryCode: match.address?.country_code?.toUpperCase() ?? null,
    };
  }
}
