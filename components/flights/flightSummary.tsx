import { format, parseISO } from "date-fns";
import { Plane, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Notice } from "@/components/ui/states";
import { DemoBadge, LiveBadge } from "@/components/trip/dataSourceBadge";
import { formatINR } from "@/lib/utils";
import type { FlightSummary } from "@/types/flight";

function duration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

function time(value: string): string {
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? "—" : format(parsed, "HH:mm");
}

export function FlightSummaryPanel({ summary }: { summary: FlightSummary | null }) {
  if (!summary || summary.source === "unavailable" || summary.perOrigin.length === 0) {
    return (
      <EmptyState
        icon={<Plane className="h-6 w-6" aria-hidden />}
        title="Flights aren't available for this combination right now"
        description="The destination can still be considered — you may be travelling by road or rail, or the route needs a manual search."
      />
    );
  }

  const live = summary.source === "duffel" || summary.source === "amadeus";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {live ? <LiveBadge checkedAt={summary.checkedAt} /> : <DemoBadge label="Sample flight prices" />}
        {summary.estimatedAverageFlightCost !== null ? (
          <Badge tone="neutral">
            Average across origins {formatINR(summary.estimatedAverageFlightCost)}
          </Badge>
        ) : null}
      </div>

      {summary.perOrigin.length > 1 ? (
        <Notice>
          Your group would fly from {summary.perOrigin.length} different cities, so there is no
          single group airfare. Each city is priced separately below.
        </Notice>
      ) : null}

      <ul className="space-y-3">
        {summary.perOrigin.map((origin) => (
          <li key={origin.originCity} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">
                {origin.originCity}
                {origin.originAirport ? (
                  <span className="ml-1.5 text-sm text-ink-faint">({origin.originAirport})</span>
                ) : null}
              </p>
              <p className="text-sm text-ink-faint">
                {origin.memberIds.length} {origin.memberIds.length === 1 ? "person" : "people"}
              </p>
            </div>

            {origin.cheapest ? (
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                <span className="font-semibold">
                  {formatINR(origin.cheapest.price)}
                  <span className="ml-1 font-normal text-ink-faint">return</span>
                </span>
                <span className="text-ink-soft">{origin.cheapest.airline}</span>
                <span className="text-ink-soft">
                  {time(origin.cheapest.departureTime)} → {time(origin.cheapest.arrivalTime)}
                </span>
                <span className="text-ink-soft">{duration(origin.cheapest.durationMinutes)}</span>
                <Badge tone={origin.cheapest.stops === 0 ? "strong" : "neutral"}>
                  {origin.cheapest.stops === 0
                    ? "Direct"
                    : `${origin.cheapest.stops} stop${origin.cheapest.stops > 1 ? "s" : ""}`}
                </Badge>
              </div>
            ) : (
              <p className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
                <TriangleAlert className="h-4 w-4 shrink-0 text-partial" aria-hidden />
                {origin.error ?? "Nothing came back for these dates."}
              </p>
            )}
          </li>
        ))}
      </ul>

      <p className="text-xs text-ink-faint">
        {live
          ? "Prices and seats move constantly. This is a search result, not a held seat — nothing is booked here."
          : "These are generated sample prices for the demo, modelled on distance. They are not real fares."}
      </p>
    </div>
  );
}
