import { format, parseISO } from "date-fns";
import { Moon, Sun, Sunrise } from "lucide-react";
import { EmptyState } from "@/components/ui/states";
import type { ItineraryDay } from "@/types/recommendation";

const SLOT = {
  morning: { label: "Morning", icon: Sunrise },
  afternoon: { label: "Afternoon", icon: Sun },
  evening: { label: "Evening", icon: Moon },
} as const;

export function ItineraryView({ days }: { days: ItineraryDay[] }) {
  if (days.length === 0) {
    return (
      <EmptyState
        title="No itinerary yet"
        description="It is generated from the group's preferences once an option is shortlisted."
      />
    );
  }

  return (
    <div>
      <p className="text-sm text-ink-soft">
        A rough shape for the days, built from what the group asked for. Treat it as a starting
        point, not a schedule.
      </p>

      <ol className="mt-5 space-y-4">
        {days.map((day) => (
          <li key={day.day} className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="text-base font-semibold">Day {day.day}</h3>
              <p className="text-sm text-ink-faint">
                {format(parseISO(day.date), "EEEE d MMMM")}
              </p>
              <p className="text-sm font-medium text-primary">{day.title}</p>
            </div>

            <ul className="mt-3 space-y-3">
              {day.items.map((item, index) => {
                const slot = SLOT[item.time];
                const Icon = slot.icon;
                return (
                  <li key={`${day.day}-${index}`} className="flex gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-ink-faint">
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wide text-ink-faint">
                        {slot.label}
                      </p>
                      <p className="text-sm font-medium">{item.title}</p>
                      {item.detail ? (
                        <p className="text-sm text-ink-soft">{item.detail}</p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
