"use client";

import * as React from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ArrowRight, Bus, CalendarDays, Car, ChevronDown, Clock, Plane, TrainFront, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DestinationArt } from "@/components/trip/destinationArt";
import { DemoBadge, LiveBadge } from "@/components/trip/dataSourceBadge";
import { FitSummary, IndividualFitList } from "./fit";
import { cn, formatINR } from "@/lib/utils";
import { TRANSPORT_LABELS } from "@/types/transport";
import type { RecommendationOption } from "@/types/recommendation";

export function OptionCard({
  option,
  tripId,
  rank,
}: {
  option: RecommendationOption;
  tripId: string;
  rank: number;
}) {
  const [showFit, setShowFit] = React.useState(false);

  // Headline travel numbers come from the mode each origin would really use.
  const chosen = (option.transportSummary?.perOrigin ?? []).flatMap((entry) => {
    const pick = entry.options.find((o) => o.mode === entry.recommended);
    return pick ? [pick] : [];
  });
  const travelHours = chosen.map((entry) => entry.durationHours);
  const modes = Array.from(new Set(chosen.map((entry) => entry.mode)));
  const ModeIcon =
    modes.length !== 1
      ? Clock
      : modes[0] === "fly"
        ? Plane
        : modes[0] === "train"
          ? TrainFront
          : modes[0] === "bus"
            ? Bus
            : Car;

  const flightsLive = option.flightSummary?.source === "duffel" || option.flightSummary?.source === "amadeus";

  return (
    <article className="card card-interactive flex flex-col overflow-hidden">
      <div className="relative h-40 sm:h-44">
        <DestinationArt
          destination={option.destination}
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 380px"
          priority={rank === 1}
        />
        {/* Keeps white text legible over any photograph. */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/20" />

        <span className="absolute left-4 top-4 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-ink backdrop-blur">
          Option {rank}
        </span>
        {rank === 1 ? (
          <span className="absolute right-4 top-4 rounded-full bg-strong px-2.5 py-1 text-xs font-bold text-white shadow-sm">
            Best match
          </span>
        ) : null}

        <div className="absolute inset-x-4 bottom-3">
          <h3 className="text-xl font-bold text-white drop-shadow-sm">
            {option.destination.name}
          </h3>
          <p className="text-sm text-white/85">
            {option.destination.city === option.destination.name
              ? option.destination.country
              : `${option.destination.city}, ${option.destination.country}`}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div>
          <FitSummary
            fits={option.individualFit}
            membersSatisfied={option.membersSatisfied}
            memberCount={option.memberCount}
          />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Detail
            icon={<CalendarDays className="h-3.5 w-3.5" aria-hidden />}
            label="Dates"
            value={`${format(parseISO(option.dates.start), "d MMM")} – ${format(parseISO(option.dates.end), "d MMM")}`}
            sub={`${option.duration} days`}
          />
          <Detail
            icon={<Wallet className="h-3.5 w-3.5" aria-hidden />}
            label="Per person"
            value={
              option.estimatedBudget.perPersonMin === option.estimatedBudget.perPersonMax
                ? formatINR(option.estimatedBudget.perPersonMin)
                : `${formatINR(option.estimatedBudget.perPersonMin)}+`
            }
            sub="Estimated total"
          />
          <Detail
            icon={<ModeIcon className="h-3.5 w-3.5" aria-hidden />}
            label="Getting there"
            value={
              option.transportSummary?.minCostPerPerson != null
                ? `${formatINR(option.transportSummary.minCostPerPerson)}+`
                : "Not available"
            }
            sub={
              modes.length === 1
                ? TRANSPORT_LABELS[modes[0]]
                : modes.length > 1
                  ? "Mixed modes"
                  : null
            }
          />
          <Detail
            icon={<Clock className="h-3.5 w-3.5" aria-hidden />}
            label="Travel time"
            value={
              travelHours.length === 0
                ? "—"
                : travelHours.length === 1 || Math.min(...travelHours) === Math.max(...travelHours)
                  ? `${travelHours[0]}h`
                  : `${Math.min(...travelHours)}–${Math.max(...travelHours)}h`
            }
            sub="Each way"
          />
        </dl>

        <ul className="mt-4 space-y-1.5">
          {option.reasons.slice(0, 2).map((reason) => (
            <li key={reason} className="text-sm text-ink-soft">
              {reason}
            </li>
          ))}
        </ul>

        {option.compromise ? (
          <p className="mt-3 rounded-2xl border border-partial/30 bg-partial-soft/40 p-3 text-sm text-ink">
            <span className="font-medium text-partial">The trade-off: </span>
            {option.compromise}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {flightsLive && option.flightSummary ? (
            <LiveBadge checkedAt={option.flightSummary.checkedAt} />
          ) : (
            <DemoBadge label="Estimated travel costs" />
          )}
          {option.transportSummary?.anyRoadFirst ? (
            <Badge tone="strong">
              <Car className="h-3 w-3" aria-hidden />
              Close enough to drive
            </Badge>
          ) : null}
          {option.explanationSource === "ai" ? <Badge tone="neutral">AI-written summary</Badge> : null}
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => setShowFit((open) => !open)}
            aria-expanded={showFit}
            className="flex w-full items-center justify-between gap-2 text-sm font-medium text-primary"
          >
            See how everyone fits
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", showFit && "rotate-180")}
              aria-hidden
            />
          </button>
          {showFit ? (
            <div className="mt-4 animate-fade">
              <IndividualFitList fits={option.individualFit} />
            </div>
          ) : null}
        </div>

        <Button asChild variant="secondary" className="mt-5 w-full">
          <Link href={`/trip/${tripId}/option/${option.id}`}>
            Open the full plan
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>
    </article>
  );
}

function Detail({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string | null;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs text-ink-faint">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
      {sub ? <dd className="text-xs text-ink-faint">{sub}</dd> : null}
    </div>
  );
}
