import Image from "next/image";
import { MapPin, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { DemoBadge } from "@/components/trip/dataSourceBadge";
import { categoryImage } from "@/data/categoryImages";
import { TRIP_STYLE_LABELS } from "@/types/preferences";
import type { Activity, ActivityCategory } from "@/types/activity";

export function ActivityGrid({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return (
      <EmptyState
        icon={<MapPin className="h-6 w-6" aria-hidden />}
        title="We couldn't find enough activity data right now"
        description="The destination still works — the places service was busy when these options were built."
      />
    );
  }

  const byCategory = new Map<ActivityCategory, Activity[]>();
  for (const activity of activities) {
    const list = byCategory.get(activity.category) ?? [];
    list.push(activity);
    byCategory.set(activity.category, list);
  }

  const isDemo = activities.some((activity) => activity.source === "demo");

  return (
    <div className="space-y-7">
      {isDemo ? (
        <div className="flex flex-wrap items-center gap-2">
          <DemoBadge label="Sample suggestions" />
          <span className="text-sm text-ink-soft">
            Generic ideas rather than real listings.
          </span>
        </div>
      ) : null}

      {[...byCategory.entries()].map(([category, list]) => (
        <section key={category}>
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink-faint">
            {TRIP_STYLE_LABELS[category]}
          </h3>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {list.map((activity) => {
              // A photo of the specific place when we have one, otherwise a
              // photo of the kind of thing it is — a beach idea shows a beach.
              const image = activity.photoUrl ?? categoryImage(activity.category).url;
              return (
                <li
                  key={activity.id}
                  className="card card-interactive flex items-stretch gap-0 overflow-hidden"
                >
                  <div className="relative w-24 shrink-0 sm:w-28">
                    <Image
                      src={image}
                      alt=""
                      fill
                      sizes="112px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1 p-3.5">
                    <p className="truncate font-semibold">{activity.name}</p>
                    {activity.address ? (
                      <p className="mt-0.5 line-clamp-2 text-xs text-ink-faint">
                        {activity.address}
                      </p>
                    ) : null}
                    {activity.rating !== null ? (
                      <Badge tone="partial" className="mt-2">
                        <Star className="h-3 w-3" aria-hidden />
                        {activity.rating.toFixed(1)}
                        {activity.userRatingCount ? ` · ${activity.userRatingCount}` : null}
                      </Badge>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <p className="text-xs text-ink-faint">
        Places from OpenStreetMap. Where we have no photograph of the exact spot, the
        picture shows the kind of place it is rather than somewhere unrelated.
      </p>
    </div>
  );
}
