import { addDays, format, parseISO } from "date-fns";
import { haversineKm } from "@/lib/providers/googleRoutes";
import type { Activity, ActivityCategory } from "@/types/activity";
import type { Destination } from "@/types/destination";
import type { ItineraryDay, ItineraryItem } from "@/types/recommendation";

interface GenerateInput {
  destination: Destination;
  start: string;
  duration: number;
  activities: Activity[];
  /** Ordered by how much the group cares, strongest first. */
  priorityCategories: ActivityCategory[];
}

/**
 * Deterministic itinerary builder. The itinerary is an output of the group's
 * preferences plus retrieved places — never something a participant fills in.
 *
 * It stays deliberately rough: arrival and departure days are kept light, no
 * more than one major activity per slot, and two places far apart are not put
 * in the same half-day.
 */
export function generateItinerary(input: GenerateInput): ItineraryDay[] {
  const { destination, start, duration, activities, priorityCategories } = input;
  if (duration < 1) return [];

  const pool = new Map<ActivityCategory, Activity[]>();
  for (const activity of activities) {
    const list = pool.get(activity.category) ?? [];
    list.push(activity);
    pool.set(activity.category, list);
  }

  const categories =
    priorityCategories.length > 0
      ? priorityCategories
      : (destination.tags.filter((t) => t !== "mixed") as ActivityCategory[]);

  const used = new Set<string>();
  const take = (category: ActivityCategory, near?: Activity | null): Activity | null => {
    const list = (pool.get(category) ?? []).filter((a) => !used.has(a.id));
    if (list.length === 0) return null;
    // Prefer something close to what is already planned for that half-day.
    const chosen = near
      ? [...list].sort((a, b) => haversineKm(near, a) - haversineKm(near, b))[0]
      : list[0];
    used.add(chosen.id);
    return chosen;
  };

  const days: ItineraryDay[] = [];

  for (let index = 0; index < duration; index++) {
    const date = format(addDays(parseISO(start), index), "yyyy-MM-dd");
    const isFirst = index === 0;
    const isLast = index === duration - 1;
    const items: ItineraryItem[] = [];

    if (isFirst) {
      items.push({
        time: "morning",
        title: `Arrive in ${destination.name}`,
        detail: "Travel day — keep the morning free in case of delays.",
        placeId: null,
      });
      items.push({
        time: "afternoon",
        title: "Check in and settle",
        detail: "Drop bags, find your feet, nothing ambitious.",
        placeId: null,
      });
      const easy =
        take(pickCategory(categories, ["relaxed", "beach", "sightseeing"])) ?? take(categories[0]);
      items.push(
        easy
          ? {
              time: "evening",
              title: easy.name,
              detail: easy.address,
              placeId: easy.placeId,
            }
          : {
              time: "evening",
              title: "First dinner together",
              detail: "Somewhere close by — save the planning for tomorrow.",
              placeId: null,
            },
      );
    } else if (isLast) {
      const slow = take(pickCategory(categories, ["food", "relaxed", "shopping"]));
      items.push(
        slow
          ? { time: "morning", title: slow.name, detail: slow.address, placeId: slow.placeId }
          : {
              time: "morning",
              title: "Slow breakfast",
              detail: "Last proper meal before heading back.",
              placeId: null,
            },
      );
      items.push({
        time: "afternoon",
        title: "Free time and packing",
        detail: "Leave room for anything the group missed.",
        placeId: null,
      });
      items.push({
        time: "evening",
        title: `Depart ${destination.name}`,
        detail: null,
        placeId: null,
      });
    } else {
      const dayCategories = rotate(categories, index - 1);
      const morning = take(dayCategories[0] ?? categories[0]);
      const afternoon = take(dayCategories[1] ?? dayCategories[0] ?? categories[0], morning);
      const evening = take(pickCategory(categories, ["food", "nightlife", "relaxed"]), afternoon);

      items.push(
        morning
          ? { time: "morning", title: morning.name, detail: morning.address, placeId: morning.placeId }
          : {
              time: "morning",
              title: `Explore ${destination.name}`,
              detail: "Pick this closer to the date.",
              placeId: null,
            },
      );
      items.push(
        afternoon
          ? {
              time: "afternoon",
              title: afternoon.name,
              detail: afternoon.address,
              placeId: afternoon.placeId,
            }
          : {
              time: "afternoon",
              title: "Open afternoon",
              detail: "Rest, or split up and do your own thing.",
              placeId: null,
            },
      );
      items.push(
        evening
          ? { time: "evening", title: evening.name, detail: evening.address, placeId: evening.placeId }
          : { time: "evening", title: "Dinner together", detail: null, placeId: null },
      );
    }

    days.push({
      day: index + 1,
      date,
      title: isFirst ? "Arrival" : isLast ? "Departure" : titleFor(items),
      items,
    });
  }

  return days;
}

function titleFor(items: ItineraryItem[]): string {
  const main = items.find((item) => item.time === "morning");
  return main?.title ?? "Exploring";
}

function pickCategory(
  categories: ActivityCategory[],
  preferred: ActivityCategory[],
): ActivityCategory {
  return preferred.find((category) => categories.includes(category)) ?? categories[0] ?? "sightseeing";
}

function rotate<T>(items: T[], by: number): T[] {
  if (items.length === 0) return items;
  const offset = ((by % items.length) + items.length) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}
