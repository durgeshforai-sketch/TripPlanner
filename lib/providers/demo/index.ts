import { AIRPORTS, getAirport } from "@/data/airports";
import { DESTINATIONS } from "@/data/destinations";
import { haversineKm } from "@/lib/providers/googleRoutes";
import type { Activity, ActivityCategory } from "@/types/activity";
import type { FlightOffer, FlightSearchParams } from "@/types/flight";
import type {
  ActivityProvider,
  PlaceDetails,
  PlaceProvider,
  PlaceSuggestion,
  RouteLeg,
  RouteProvider,
  FlightProvider,
} from "../types";
import { between, pick, seeded } from "./seed";

/**
 * Demo implementations of every provider.
 *
 * Rules these follow: derive from real reference data (catalog coordinates,
 * airport positions) rather than inventing facts, and never name a business or
 * quote a price that a user could mistake for a real listing. Everything they
 * return is surfaced in the UI behind a "Sample data" label.
 */

const CITY_INDEX: PlaceDetails[] = [
  ...AIRPORTS.map((a) => ({
    placeId: `demo-city-${a.code}`,
    name: a.city,
    formattedAddress: `${a.city}, ${a.countryCode}`,
    latitude: a.latitude,
    longitude: a.longitude,
    countryCode: a.countryCode,
  })),
  ...DESTINATIONS.map((d) => ({
    placeId: `demo-dest-${d.id}`,
    name: d.name,
    formattedAddress: `${d.city}, ${d.country}`,
    latitude: d.latitude,
    longitude: d.longitude,
    countryCode: d.countryCode,
  })),
];

const BY_PLACE_ID = new Map(CITY_INDEX.map((p) => [p.placeId, p]));

export class DemoPlaceProvider implements PlaceProvider {
  readonly source = "demo" as const;

  async autocomplete(input: string): Promise<PlaceSuggestion[]> {
    const needle = input.trim().toLowerCase();
    if (needle.length < 2) return [];
    const seen = new Set<string>();
    return CITY_INDEX.filter((p) => p.name.toLowerCase().includes(needle))
      .filter((p) => {
        const key = p.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 6)
      .map((p) => ({
        placeId: p.placeId,
        primaryText: p.name,
        secondaryText: p.formattedAddress,
        description: p.formattedAddress ?? p.name,
      }));
  }

  async details(placeId: string): Promise<PlaceDetails | null> {
    return BY_PLACE_ID.get(placeId) ?? null;
  }
}

export class DemoRouteProvider implements RouteProvider {
  readonly source = "demo" as const;

  async drive(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
  ): Promise<RouteLeg | null> {
    const straight = haversineKm(origin, destination);
    // Roads are longer than the straight line; 1.25x and 48 km/h are planning
    // rules of thumb, shown as "estimated" rather than as a routed result.
    const distanceKm = Math.round(straight * 1.25);
    return { distanceKm, durationMinutes: Math.round((distanceKm / 48) * 60) };
  }
}

/**
 * Carriers are split by route type so sample data does not show, say, a
 * Singapore Airlines hop between two Indian cities.
 */
const DOMESTIC_AIRLINES = ["IndiGo", "Air India", "Akasa Air", "SpiceJet"];
const INTERNATIONAL_AIRLINES = [
  "IndiGo",
  "Air India",
  "Emirates",
  "Singapore Airlines",
  "Thai Airways",
  "Qatar Airways",
];

export class DemoFlightProvider implements FlightProvider {
  readonly source = "demo" as const;

  async searchFlights(params: FlightSearchParams): Promise<FlightOffer[]> {
    const from = getAirport(params.originAirport);
    const to = getAirport(params.destinationAirport);
    if (!from || !to || from.code === to.code) return [];

    const distanceKm = haversineKm(from, to);
    const random = seeded(
      `${params.originAirport}-${params.destinationAirport}-${params.departureDate}`,
    );

    // Round-trip economy, modelled from distance. Clearly sample pricing.
    const international = from.countryCode !== to.countryCode;
    const base = international ? 9000 : 4200;
    const perKm = international ? 3.6 : 4.4;
    const fare = base + distanceKm * perKm * between(random, 0.85, 1.25);

    const count = 3;
    return Array.from({ length: count }, (_, index) => {
      const offerRandom = seeded(`${params.originAirport}${params.destinationAirport}${index}`);
      const stops = distanceKm > 3200 ? (index === 0 ? 1 : index === 1 ? 1 : 2) : index === 2 ? 1 : 0;
      const cruiseMinutes = Math.round((distanceKm / 780) * 60) + 35;
      const durationMinutes = cruiseMinutes + stops * Math.round(between(offerRandom, 70, 150));
      const departHour = Math.floor(between(offerRandom, 5, 20));
      const departMinute = pick(offerRandom, [0, 15, 30, 45]);
      const departure = new Date(
        `${params.departureDate}T${String(departHour).padStart(2, "0")}:${String(departMinute).padStart(2, "0")}:00Z`,
      );
      const arrival = new Date(departure.getTime() + durationMinutes * 60_000);
      const price = Math.round(
        (fare * (1 + index * 0.12) * (stops === 0 ? 1.12 : 1)) / 50,
      ) * 50;
      const airline = pick(offerRandom, international ? INTERNATIONAL_AIRLINES : DOMESTIC_AIRLINES);

      return {
        id: `demo-${params.originAirport}-${params.destinationAirport}-${index}`,
        origin: from.code,
        destination: to.code,
        departureTime: departure.toISOString(),
        arrivalTime: arrival.toISOString(),
        durationMinutes,
        stops,
        airline,
        price,
        currency: "INR",
        segments: [
          {
            airline,
            airlineCode: "XX",
            flightNumber: null,
            departureAirport: from.code,
            arrivalAirport: to.code,
            departureTime: departure.toISOString(),
            arrivalTime: arrival.toISOString(),
          },
        ],
        source: "demo" as const,
      };
    }).sort((a, b) => a.price - b.price);
  }

  async getAirportSuggestions(
    query: string,
  ): Promise<{ code: string; name: string; city: string }[]> {
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) return [];
    return AIRPORTS.filter(
      (a) => a.city.toLowerCase().includes(needle) || a.code.toLowerCase() === needle,
    )
      .slice(0, 6)
      .map((a) => ({ code: a.code, name: a.name, city: a.city }));
  }
}

/**
 * Generic, descriptive activity ideas. These deliberately do not name real
 * businesses — a sample dataset should not put a plausible-looking but invented
 * restaurant in front of someone planning a trip. They are also written without
 * a time of day, because the itinerary decides which half-day they land in.
 */
const ACTIVITY_IDEAS: Record<ActivityCategory, string[]> = {
  adventure: [
    "Half-day adventure activity",
    "Guided outdoor excursion",
    "Water sports session",
    "Trail walk with a local guide",
  ],
  relaxed: [
    "Local cafe stop",
    "Spa and unwind session",
    "Viewpoint with nothing planned",
    "Long meal and a walk",
  ],
  sightseeing: [
    "Main landmark walking route",
    "Old town loop",
    "Viewpoint and photo stop",
    "Heritage site visit",
  ],
  beach: [
    "Main beach day",
    "Quieter beach further along the coast",
    "Time on the shore",
    "Beachside meal",
  ],
  food: [
    "Local speciality spot",
    "Street food walk",
    "Regional restaurant",
    "Market tasting stop",
  ],
  nightlife: [
    "Live music venue",
    "Rooftop or beachfront bar",
    "Late night food run",
    "Club district walk",
  ],
  nature: [
    "Nature reserve or park visit",
    "Waterfall or lake stop",
    "Easy forest trail",
    "Scenic drive with viewpoints",
  ],
  culture: [
    "Museum visit",
    "Temple or historic quarter",
    "Local craft or art district",
    "Cultural performance",
  ],
  shopping: [
    "Main market browse",
    "Local crafts and souvenirs",
    "Shopping street walk",
    "Night market",
  ],
};

export class DemoActivityProvider implements ActivityProvider {
  readonly source = "demo" as const;

  async searchActivities(
    destination: { name: string; latitude: number; longitude: number },
    category: ActivityCategory,
    limit: number,
  ): Promise<Activity[]> {
    const ideas = ACTIVITY_IDEAS[category];
    return ideas.slice(0, limit).map((idea, index) => {
      const random = seeded(`${destination.name}-${category}-${index}`);
      return {
        id: `demo-${destination.name}-${category}-${index}`.toLowerCase().replace(/\s+/g, "-"),
        name: idea,
        address: `Around ${destination.name}`,
        rating: null,
        userRatingCount: null,
        placeId: null,
        latitude: destination.latitude + between(random, -0.06, 0.06),
        longitude: destination.longitude + between(random, -0.06, 0.06),
        category,
        photoUrl: null,
        source: "demo" as const,
      };
    });
  }
}
