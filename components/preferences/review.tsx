"use client";

import { format, parseISO } from "date-fns";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/utils";
import { TRIP_STYLE_LABELS } from "@/types/preferences";
import { TRANSPORT_LABELS } from "@/types/transport";
import type { DateRange } from "@/types/preferences";
import type { Draft } from "./types";

function formatRanges(ranges: DateRange[]): string {
  if (ranges.length === 0) return "Nothing marked";
  return ranges
    .slice(0, 4)
    .map((range) =>
      range.start === range.end
        ? format(parseISO(range.start), "d MMM")
        : `${format(parseISO(range.start), "d MMM")}–${format(parseISO(range.end), "d MMM")}`,
    )
    .join(", ")
    .concat(ranges.length > 4 ? ` and ${ranges.length - 4} more` : "");
}

function Section({
  title,
  step,
  onEdit,
  children,
}: {
  title: string;
  step: number;
  onEdit: (step: number) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <button
          type="button"
          onClick={() => onEdit(step)}
          className="flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-primary hover:bg-primary-soft"
        >
          <Pencil className="h-3 w-3" aria-hidden />
          Edit
          <span className="sr-only"> {title}</span>
        </button>
      </div>
      <div className="mt-2 text-sm text-ink-soft">{children}</div>
    </section>
  );
}

export function PreferenceReview({
  draft,
  onEdit,
}: {
  draft: Draft;
  onEdit: (step: number) => void;
}) {
  const musts = draft.tripStyles.filter((s) => s.priority === "must");
  const nices = draft.tripStyles.filter((s) => s.priority === "nice");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Here is what we will tell the group</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Your answers are only used to work out where the group overlaps. Change anything that
          does not look right.
        </p>
      </div>

      <Section title="Where" step={0} onEdit={onEdit}>
        <p>
          {draft.travelScope === "domestic"
            ? "Domestic only"
            : draft.travelScope === "international"
              ? "International"
              : "Open to domestic or international"}
        </p>
        {draft.desiredDestinations.length > 0 ? (
          <p className="mt-1">
            Places in mind: {draft.desiredDestinations.map((d) => d.name).join(", ")}
          </p>
        ) : (
          <p className="mt-1">Open to suggestions</p>
        )}
      </Section>

      <Section title="Budget" step={1} onEdit={onEdit}>
        <p>
          Comfortable at {formatINR(draft.comfortableBudget)}, hard maximum{" "}
          {formatINR(draft.maximumBudget)}.
        </p>
        <p className="mt-1">
          Flexibility:{" "}
          {draft.budgetFlexibility === "high"
            ? "very flexible"
            : draft.budgetFlexibility === "medium"
              ? "somewhat flexible"
              : "not very flexible"}
          .
        </p>
      </Section>

      <Section title="Dates" step={2} onEdit={onEdit}>
        <dl className="space-y-1">
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-ink-faint">Ideal</dt>
            <dd>{formatRanges(draft.preferredDates)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-ink-faint">Could work</dt>
            <dd>{formatRanges(draft.possibleDates)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-ink-faint">Can&rsquo;t travel</dt>
            <dd>{formatRanges(draft.unavailableDates)}</dd>
          </div>
        </dl>
      </Section>

      <Section title="Trip length" step={3} onEdit={onEdit}>
        <p>
          {draft.preferredDays} days ideally, between {draft.minDays} and {draft.maxDays}.
        </p>
      </Section>

      <Section title="Trip style" step={4} onEdit={onEdit}>
        {musts.length === 0 && nices.length === 0 ? (
          <p>Nothing marked yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {musts.map((entry) => (
              <Badge key={entry.style} tone="primary">
                {TRIP_STYLE_LABELS[entry.style]} · must
              </Badge>
            ))}
            {nices.map((entry) => (
              <Badge key={entry.style} tone="neutral">
                {TRIP_STYLE_LABELS[entry.style]}
              </Badge>
            ))}
          </div>
        )}
      </Section>

      <Section title="Must haves and deal breakers" step={5} onEdit={onEdit}>
        <div className="flex flex-wrap gap-2">
          {draft.mustHaves.map((entry) => (
            <Badge key={entry} tone="strong">
              {entry}
            </Badge>
          ))}
          {draft.dealBreakers.map((entry) => (
            <Badge key={entry} tone="notfit">
              {entry}
            </Badge>
          ))}
          {draft.mustHaves.length === 0 && draft.dealBreakers.length === 0 ? (
            <p>Nothing marked — anything goes.</p>
          ) : null}
        </div>
      </Section>

      <Section title="Travelling from" step={6} onEdit={onEdit}>
        <p>{draft.originCity || "Not set"}</p>
      </Section>

      <Section title="How you travel" step={7} onEdit={onEdit}>
        {draft.transportModes.length === 0 ? (
          <p>Nothing picked yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {draft.transportModes.map((mode) => (
              <Badge key={mode} tone="neutral">
                {TRANSPORT_LABELS[mode]}
              </Badge>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
