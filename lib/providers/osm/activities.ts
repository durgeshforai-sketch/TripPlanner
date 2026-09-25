import "server-only";
import { z } from "zod";
import { fetchJson } from "@/lib/http";
import { categoryImage } from "@/data/categoryImages";
import type { Activity, ActivityCategory } from "@/types/activity";
import type { ActivityProvider } from "../types";
import { OSM_USER_AGENT } from "./places";

const MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const overpassSchema = z.object({
  elements: z
    .array(
      z.object({
        type: z.string(),
        id: z.number(),
        lat: z.number().optional(),
        lon: z.number().optional(),
        center: z.object({ lat: z.number(), lon: z.number() }).optional(),
        tags: z.record(z.string(), z.string()).optional(),
      }),
    )
    .default([]),
});

/** OpenStreetMap tag filters per category. */
const FILTERS: Record<ActivityCategory, string[]> = {
  beach: ['node["natural"="beach"]', 'way["natural"="beach"]', 'node["leisure"="beach_resort"]'],
  nature: [
    'node["tourism"="viewpoint"]',
    'way["natural"="waterfall"]',
    'node["waterway"="waterfall"]',
    'way["leisure"="nature_reserve"]',
  ],
  sightseeing: [
    'node["tourism"="attraction"]',
    'way["tourism"="attraction"]',
    'node["historic"~"monument|memorial|castle|fort"]',
  ],
  culture: [
    'node["tourism"="museum"]',
    'way["tourism"="museum"]',
    'node["amenity"="place_of_worship"]["name"]',
    'node["historic"="ruins"]',
  ],
  food: ['node["amenity"="restaurant"]', 'node["amenity"="cafe"]'],
  nightlife: ['node["amenity"~"bar|pub|nightclub"]'],
  shopping: ['node["shop"="mall"]', 'node["amenity"="marketplace"]', 'way["shop"="mall"]'],
  adventure: [
    'node["sport"~"scuba_diving|surfing|climbing|paragliding|rafting"]',
    'node["tourism"="wilderness_hut"]',
    'node["leisure"="water_park"]',
  ],
  relaxed: ['node["leisure"="park"]', 'node["amenity"="spa"]', 'node["leisure"="garden"]'],
};

/**
 * Real, named places from OpenStreetMap — free and keyless.
 *
 * The public Overpass servers are community-run and frequently busy, so this
 * tries a second mirror and the caller falls back to sample data rather than
 * losing the destination.
 */
export class OsmActivityProvider implements ActivityProvider {
  readonly source = "osm" as const;

  async searchActivities(
    destination: { name: string; latitude: number; longitude: number },
    category: ActivityCategory,
    limit: number,
  ): Promise<Activity[]> {
    const radius = category === "food" || category === "nightlife" ? 12_000 : 25_000;
    const clauses = FILTERS[category]
      .map((filter) => `${filter}(around:${radius},${destination.latitude},${destination.longitude});`)
      .join("");
    const query = `[out:json][timeout:25];(${clauses});out center ${limit * 6};`;

    let lastError: unknown = null;
    for (const mirror of MIRRORS) {
      try {
        const raw = await fetchJson(mirror, {
          provider: "overpass",
          method: "POST",
          headers: {
            "User-Agent": OSM_USER_AGENT,
            "content-type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ data: query }).toString(),
          rawBody: true,
          timeoutMs: 18_000,
          retries: 0,
          next: { revalidate: 60 * 60 * 24 * 14 },
        });

        return this.normalise(raw, category, limit);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError ?? new Error("Overpass unavailable");
  }

  private normalise(raw: unknown, category: ActivityCategory, limit: number): Activity[] {
    const seen = new Set<string>();

    return overpassSchema
      .parse(raw)
      .elements.flatMap((element) => {
        const tags = element.tags ?? {};
        const name = tags.name;
        if (!name) return [];

        const key = name.toLowerCase();
        if (seen.has(key)) return [];
        seen.add(key);

        const latitude = element.lat ?? element.center?.lat;
        const longitude = element.lon ?? element.center?.lon;
        if (latitude === undefined || longitude === undefined) return [];

        const address =
          [tags["addr:street"], tags["addr:city"], tags["addr:suburb"]]
            .filter(Boolean)
            .join(", ") || null;

        return [
          {
            id: `osm-${element.type}-${element.id}`,
            name,
            address,
            rating: null,
            userRatingCount: null,
            placeId: null,
            latitude,
            longitude,
            category,
            // OSM has no photographs, so the card shows a picture of the kind
            // of place it is. Never a photo of somewhere unrelated.
            photoUrl: categoryImage(category).url,
            source: "osm" as const,
          },
        ];
      })
      .slice(0, limit);
  }
}
