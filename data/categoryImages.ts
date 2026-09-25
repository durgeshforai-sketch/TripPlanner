import raw from "./categoryImages.json";
import type { ActivityCategory } from "@/types/activity";
import type { DestinationImage } from "@/types/destination";

/**
 * One representative photograph per activity category.
 *
 * When we know the specific place, the card shows that place. When we only know
 * the kind of thing — "main beach day", "street food walk" — it shows a photo of
 * that kind of thing rather than an unrelated view, which is the rule the
 * product follows: a beach idea shows a beach.
 *
 * Each image was chosen by eye from Wikimedia Commons candidates; filename
 * matching alone produced things like a scanned nursery catalogue for "beach".
 */
const IMAGES = raw as Record<string, DestinationImage>;

const FALLBACK: DestinationImage = IMAGES.sightseeing;

export function categoryImage(category: ActivityCategory): DestinationImage {
  return IMAGES[category] ?? FALLBACK;
}

export function allCategoryImages(): Record<string, DestinationImage> {
  return IMAGES;
}
