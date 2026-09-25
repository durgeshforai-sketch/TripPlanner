import type { TripStyle } from "./preferences";

export type ActivityCategory = Exclude<TripStyle, "mixed">;

export interface Activity {
  id: string;
  name: string;
  address: string | null;
  rating: number | null;
  userRatingCount: number | null;
  placeId: string | null;
  latitude: number;
  longitude: number;
  category: ActivityCategory;
  photoUrl: string | null;
  source: "google-places" | "osm" | "demo";
}
