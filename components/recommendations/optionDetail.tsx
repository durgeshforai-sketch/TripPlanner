"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { Car, CircleCheck, CircleMinus, Plane, Route } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/states";
import { TripMap } from "@/components/map/tripMap";
import { FlightSummaryPanel } from "@/components/flights/flightSummary";
import { TransportPanel } from "@/components/flights/transportPanel";
import { ActivityGrid } from "@/components/activities/activityGrid";
import { ItineraryView } from "./itinerary";
import { IndividualFitList } from "./fit";
import { formatINR } from "@/lib/utils";
import { TRIP_STYLE_LABELS } from "@/types/preferences";
import type { RecommendationOption } from "@/types/recommendation";

export function OptionDetail({ option }: { option: RecommendationOption }) {
  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
        <TabsTrigger value="travel">Getting there</TabsTrigger>
        <TabsTrigger value="activities">Activities</TabsTrigger>
        <TabsTrigger value="map">Map</TabsTrigger>
        <TabsTrigger value="fit">Who it works for</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <Overview option={option} />
      </TabsContent>

      <TabsContent value="itinerary">
        <ItineraryView days={option.itinerary} />
      </TabsContent>

      <TabsContent value="travel">
        <TransportPanel summary={option.transportSummary} />
        {option.flightSummary && option.flightSummary.source !== "unavailable" ? (
          <div className="mt-8">
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink-faint">
              Flight options in detail
            </h3>
            <div className="mt-3">
              <FlightSummaryPanel summary={option.flightSummary} />
            </div>
          </div>
        ) : null}
      </TabsContent>

      <TabsContent value="activities">
        <ActivityGrid activities={option.activities} />
      </TabsContent>

      <TabsContent value="map">
        <TripMap destination={option.destination} activities={option.activities} />
        <TravelTable option={option} />
      </TabsContent>

      <TabsContent value="fit">
        <p className="mb-4 text-sm text-ink-soft">
          Everyone in the group, least suited first. Nothing is hidden here — that is the point.
        </p>
        <IndividualFitList fits={option.individualFit} />
      </TabsContent>
    </Tabs>
  );
}

function Overview({ option }: { option: RecommendationOption }) {
  const worksFor = option.individualFit.filter(
    (fit) => fit.status === "strong" || fit.status === "good",
  );
  const struggles = option.individualFit.filter(
    (fit) => fit.status === "partial" || fit.status === "not-fit",
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <CircleCheck className="h-4 w-4 text-strong" aria-hidden />
          Why this works
        </h2>
        <ul className="mt-3 space-y-2">
          {option.reasons.map((reason) => (
            <li key={reason} className="text-sm text-ink-soft">
              {reason}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-ink-soft">{option.destination.description}</p>
        {option.topStyles.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {option.topStyles.map((style) => (
              <Badge key={style} tone="primary">
                {TRIP_STYLE_LABELS[style]}
              </Badge>
            ))}
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <CircleMinus className="h-4 w-4 text-notfit" aria-hidden />
          Why it might not
        </h2>
        {option.compromise ? (
          <p className="mt-3 text-sm text-ink-soft">{option.compromise}</p>
        ) : (
          <p className="mt-3 text-sm text-ink-soft">
            Nobody flagged a problem with this one.
          </p>
        )}

        {struggles.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {struggles.map((fit) => (
              <li key={fit.memberId} className="text-sm">
                <span className="font-medium">{fit.memberName}: </span>
                <span className="text-ink-soft">
                  {fit.conflicts[0] ?? "not quite their kind of trip"}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-5 rounded-2xl border border-border bg-surface-muted/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
            What the estimate covers
          </p>
          <dl className="mt-2 space-y-1.5 text-sm">
            {option.estimatedBudget.breakdown.map((line) => (
              <div key={line.label} className="flex justify-between gap-4">
                <dt className="text-ink-soft">{line.label}</dt>
                <dd className="shrink-0 font-medium">{formatINR(line.amount)}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-ink-faint">
            Per person, a planning estimate rather than a quote. It moves with when you book.
          </p>
        </div>

        <p className="mt-4 text-sm text-ink-soft">
          Works well for {worksFor.length} of {option.memberCount}.
        </p>
      </section>
    </div>
  );
}

function TravelTable({ option }: { option: RecommendationOption }) {
  const perOrigin = option.travelSummary?.perOrigin ?? [];
  if (perOrigin.length === 0) return null;

  return (
    <div className="mt-5">
      <h3 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-ink-faint">
        <Route className="h-4 w-4" aria-hidden />
        Getting there
      </h3>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {perOrigin.map((entry) => (
          <li
            key={entry.originCity}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-ink-soft">
              {entry.mode === "drive" ? (
                <Car className="h-4 w-4" aria-hidden />
              ) : (
                <Plane className="h-4 w-4" aria-hidden />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {entry.originCity} → {option.destination.name}
              </p>
              <p className="text-sm text-ink-soft">
                {entry.distanceKm !== null ? `${entry.distanceKm} km` : "Distance unknown"}
                {entry.durationMinutes !== null
                  ? ` · about ${Math.round((entry.durationMinutes / 60) * 10) / 10}h`
                  : ""}
              </p>
            </div>
            {entry.source !== "google-routes" ? (
              <Badge tone="neutral">Estimated</Badge>
            ) : null}
          </li>
        ))}
      </ul>
      {option.travelSummary?.note ? (
        <Notice className="mt-3">{option.travelSummary.note}</Notice>
      ) : null}
    </div>
  );
}

export function OptionHero({ option }: { option: RecommendationOption }) {
  return (
    <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
      <div>
        <p className="text-sm text-ink-faint">Option {option.rank}</p>
        <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">{option.destination.name}</h1>
        <p className="mt-1 text-ink-soft">
          {option.destination.city}, {option.destination.country}
        </p>
      </div>
      <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
        <div>
          <dt className="text-ink-faint">Dates</dt>
          <dd className="mt-0.5 font-semibold">
            {format(parseISO(option.dates.start), "d MMM")} –{" "}
            {format(parseISO(option.dates.end), "d MMM yyyy")}
          </dd>
        </div>
        <div>
          <dt className="text-ink-faint">Length</dt>
          <dd className="mt-0.5 font-semibold">{option.duration} days</dd>
        </div>
        <div>
          <dt className="text-ink-faint">Estimated cost</dt>
          <dd className="mt-0.5 font-semibold">
            {option.estimatedBudget.perPersonMin === option.estimatedBudget.perPersonMax
              ? formatINR(option.estimatedBudget.perPersonMin)
              : `${formatINR(option.estimatedBudget.perPersonMin)} – ${formatINR(option.estimatedBudget.perPersonMax)}`}
            <span className="ml-1 font-normal text-ink-faint">pp</span>
          </dd>
        </div>
      </dl>
    </div>
  );
}
