import { Bus, Car, Plane, TrainFront } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Notice } from "@/components/ui/states";
import { IconChip } from "@/components/ui/iconChip";
import { cn, formatINR } from "@/lib/utils";
import { TRANSPORT_LABELS, type TransportMode, type TransportSummary } from "@/types/transport";

const ICONS: Record<TransportMode, typeof Plane> = {
  fly: Plane,
  train: TrainFront,
  bus: Bus,
  drive: Car,
};

function hours(value: number): string {
  if (value < 1) return `${Math.round(value * 60)}m`;
  const whole = Math.floor(value);
  const minutes = Math.round((value - whole) * 60);
  return minutes === 0 ? `${whole}h` : `${whole}h ${minutes}m`;
}

/**
 * Every practical way of getting there, per origin city.
 *
 * Road options lead for short trips because that is what the group would
 * actually do — a 200 km flight costs more and, once airport time is counted,
 * is not faster either.
 */
export function TransportPanel({ summary }: { summary: TransportSummary | null }) {
  if (!summary || summary.perOrigin.length === 0) {
    return (
      <EmptyState
        icon={<Car className="h-6 w-6" aria-hidden />}
        title="We could not work out how you would get there"
        description="The destination can still be considered — this route needs checking by hand."
      />
    );
  }

  return (
    <div className="space-y-4">
      {summary.anyRoadFirst ? (
        <Notice tone="info">
          Some of you are close enough to travel overland. We have put road options first
          for them — flying that distance costs more and saves no time once you count
          getting to the airport.
        </Notice>
      ) : null}

      {summary.perOrigin.length > 1 ? (
        <Notice>
          Your group is starting from {summary.perOrigin.length} cities, so there is no
          single group fare. Each is worked out separately below.
        </Notice>
      ) : null}

      <ul className="space-y-4">
        {summary.perOrigin.map((origin) => (
          <li key={origin.originCity} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold">
                From {origin.originCity}
                {origin.roadDistanceKm !== null ? (
                  <span className="ml-2 text-sm font-normal text-ink-faint">
                    {origin.roadDistanceKm} km by road
                  </span>
                ) : null}
              </p>
              <p className="text-sm text-ink-faint">
                {origin.memberIds.length} {origin.memberIds.length === 1 ? "person" : "people"}
              </p>
            </div>

            <ul className="mt-3 space-y-2">
              {[...origin.options]
                .sort((a, b) => {
                  // Recommended first, then anything sensible, then the rest.
                  if (a.mode === origin.recommended) return -1;
                  if (b.mode === origin.recommended) return 1;
                  if (a.sensible !== b.sensible) return a.sensible ? -1 : 1;
                  return a.costPerPerson - b.costPerPerson;
                })
                .map((option) => {
                  const Icon = ICONS[option.mode];
                  const recommended = option.mode === origin.recommended;
                  return (
                    <li
                      key={option.mode}
                      className={cn(
                        "flex flex-wrap items-center gap-3 rounded-xl border p-3",
                        recommended
                          ? "border-primary/40 bg-primary-soft/40"
                          : option.sensible
                            ? "border-border"
                            : "border-border bg-surface-muted/50 opacity-70",
                      )}
                    >
                      <IconChip tone={recommended ? "primary" : "neutral"} size="sm">
                        <Icon className="h-4 w-4" aria-hidden />
                      </IconChip>

                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                          {TRANSPORT_LABELS[option.mode]}
                          {recommended ? <Badge tone="primary">Best for this trip</Badge> : null}
                          {option.overnight ? <Badge tone="partial">Overnight</Badge> : null}
                          {!option.sensible ? (
                            <Badge tone="neutral">Not worth it here</Badge>
                          ) : null}
                        </p>
                        {option.note ? (
                          <p className="text-xs text-ink-faint">{option.note}</p>
                        ) : null}
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-bold">{formatINR(option.costPerPerson)}</p>
                        <p className="text-xs text-ink-faint">
                          {hours(option.durationHours)} each way
                          {option.costBasis === "estimated" ? " · est." : ""}
                        </p>
                      </div>
                    </li>
                  );
                })}
            </ul>
          </li>
        ))}
      </ul>

      <p className="text-xs text-ink-faint">
        Return cost per person. Road, rail and coach figures are planning estimates from
        distance, not quoted fares — check before booking.
      </p>
    </div>
  );
}
