"use client";

import * as React from "react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/client/api";
import { cn } from "@/lib/utils";
import type { DateRange } from "@/types/preferences";

export type DayState = "preferred" | "possible" | "unavailable";

const MODES: { value: DayState; label: string; hint: string; dot: string; cell: string }[] = [
  {
    value: "preferred",
    label: "Ideal",
    hint: "The dates you would pick",
    dot: "bg-strong",
    cell: "bg-strong-soft text-strong border-strong/40",
  },
  {
    value: "possible",
    label: "Could work",
    hint: "You could make these work",
    dot: "bg-good",
    cell: "bg-good-soft text-good border-good/40",
  },
  {
    value: "unavailable",
    label: "Can't travel",
    hint: "Definitely not free",
    dot: "bg-notfit",
    cell: "bg-notfit-soft text-notfit border-notfit/40",
  },
];

interface Holiday {
  date: string;
  localName: string;
}

interface LongWeekend {
  start: string;
  end: string;
  days: number;
  label: string;
  bridgeDays: string[];
}

export interface AvailabilityValue {
  preferred: DateRange[];
  possible: DateRange[];
  unavailable: DateRange[];
}

const iso = (date: Date): string => format(date, "yyyy-MM-dd");

function toDayMap(value: AvailabilityValue): Map<string, DayState> {
  const map = new Map<string, DayState>();
  const apply = (ranges: DateRange[], state: DayState) => {
    for (const range of ranges) {
      let cursor = parseISO(range.start);
      const end = parseISO(range.end);
      while (cursor <= end) {
        map.set(iso(cursor), state);
        cursor = addDays(cursor, 1);
      }
    }
  };
  // Applied weakest first so a stronger marking wins if data ever overlaps.
  apply(value.possible, "possible");
  apply(value.preferred, "preferred");
  apply(value.unavailable, "unavailable");
  return map;
}

function toValue(map: Map<string, DayState>): AvailabilityValue {
  const buckets: Record<DayState, string[]> = { preferred: [], possible: [], unavailable: [] };
  for (const [day, state] of map) buckets[state].push(day);
  const group = (days: string[]): DateRange[] => {
    const sorted = [...days].sort();
    const ranges: DateRange[] = [];
    for (const day of sorted) {
      const last = ranges[ranges.length - 1];
      if (last && iso(addDays(parseISO(last.end), 1)) === day) last.end = day;
      else ranges.push({ start: day, end: day });
    }
    return ranges;
  };
  return {
    preferred: group(buckets.preferred),
    possible: group(buckets.possible),
    unavailable: group(buckets.unavailable),
  };
}

/**
 * Availability is captured as one calendar with three markings rather than three
 * separate date pickers. A day can only hold one marking, which is what keeps
 * "preferred but also unavailable" impossible to enter in the first place.
 */
export function AvailabilityCalendar({
  value,
  onChange,
  countryCode = "IN",
}: {
  value: AvailabilityValue;
  onChange: (value: AvailabilityValue) => void;
  countryCode?: string;
}) {
  const today = React.useMemo(() => new Date(), []);
  const [month, setMonth] = React.useState(() => startOfMonth(today));
  const [mode, setMode] = React.useState<DayState>("preferred");
  const [anchor, setAnchor] = React.useState<string | null>(null);
  const [hovered, setHovered] = React.useState<string | null>(null);

  const days = toDayMap(value);

  const from = iso(startOfMonth(month));
  const to = iso(endOfMonth(addMonths(month, 1)));
  const rangeKey = `${countryCode}:${from}:${to}`;

  // Keyed by the range it was fetched for, so "loading" is derived from whether
  // what we hold matches what is on screen rather than tracked separately.
  const [fetched, setFetched] = React.useState<{
    key: string;
    holidays: Holiday[];
    longWeekends: LongWeekend[];
    degraded: boolean;
  } | null>(null);

  const current = fetched?.key === rangeKey ? fetched : null;
  const holidays = current?.holidays ?? [];
  const longWeekends = current?.longWeekends ?? [];
  const holidayState: "loading" | "ready" | "degraded" = !current
    ? "loading"
    : current.degraded
      ? "degraded"
      : "ready";

  React.useEffect(() => {
    let cancelled = false;
    apiFetch<{
      holidays: Holiday[];
      longWeekends: LongWeekend[];
      degraded: boolean;
    }>(`/api/holidays?country=${countryCode}&from=${from}&to=${to}`)
      .then((data) => {
        if (!cancelled) setFetched({ key: rangeKey, ...data });
      })
      .catch(() => {
        // Holiday badges are a nicety; the calendar still works without them.
        if (!cancelled) {
          setFetched({ key: rangeKey, holidays: [], longWeekends: [], degraded: true });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [rangeKey, from, to, countryCode]);

  const holidayByDate = new Map(holidays.map((h) => [h.date, h.localName]));

  function commit(day: string) {
    if (anchor === null) {
      setAnchor(day);
      return;
    }
    const [start, end] = anchor <= day ? [anchor, day] : [day, anchor];
    const next = new Map(days);
    const span = eachDayOfInterval({ start: parseISO(start), end: parseISO(end) }).map(iso);
    // Re-selecting an identical stretch in the same mode clears it.
    const allSame = span.every((d) => next.get(d) === mode);
    for (const d of span) {
      if (allSame) next.delete(d);
      else next.set(d, mode);
    }
    setAnchor(null);
    setHovered(null);
    onChange(toValue(next));
  }

  const previewRange = (() => {
    if (!anchor || !hovered) return null;
    const [start, end] = anchor <= hovered ? [anchor, hovered] : [hovered, anchor];
    return { start, end };
  })();

  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const cells = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  const activeMode = MODES.find((m) => m.value === mode) ?? MODES[0];

  const relevantLongWeekends = longWeekends
    .filter((window) => window.start >= from && window.start <= to)
    .slice(0, 3);

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="What are you marking?"
        className="flex flex-wrap gap-2"
      >
        {MODES.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={mode === option.value}
            onClick={() => {
              setMode(option.value);
              setAnchor(null);
            }}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
              mode === option.value
                ? "border-primary bg-primary-soft text-primary"
                : "border-border bg-surface text-ink-soft hover:border-border-strong",
            )}
          >
            <span aria-hidden className={cn("h-2.5 w-2.5 rounded-full", option.dot)} />
            {option.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-sm text-ink-faint">
        {anchor
          ? `Now pick the last day of the stretch you ${activeMode.label.toLowerCase()} — or click the same day again for one day.`
          : `${activeMode.hint}. Click a start day, then an end day.`}
      </p>

      <div className="mt-4 rounded-3xl border border-border bg-surface p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Previous month"
            disabled={iso(endOfMonth(subMonths(month, 1))) < iso(today)}
            onClick={() => setMonth(subMonths(month, 1))}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <p aria-live="polite" className="text-sm font-semibold">
            {format(month, "MMMM yyyy")}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Next month"
            onClick={() => setMonth(addMonths(month, 1))}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-ink-faint">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day} className="py-1">
              <span aria-hidden>{day.slice(0, 1)}</span>
              <span className="sr-only">{day}</span>
            </div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((date) => {
            const day = iso(date);
            const outside = !isSameMonth(date, month);
            const past = day < iso(today);
            const state = days.get(day);
            const holiday = holidayByDate.get(day);
            const inPreview =
              previewRange !== null && day >= previewRange.start && day <= previewRange.end;
            const style = MODES.find((m) => m.value === state);

            return (
              <button
                key={day}
                type="button"
                disabled={past || outside}
                onClick={() => commit(day)}
                onMouseEnter={() => setHovered(day)}
                onFocus={() => setHovered(day)}
                aria-pressed={Boolean(state)}
                aria-label={[
                  format(date, "EEEE d MMMM yyyy"),
                  state ? MODES.find((m) => m.value === state)?.label : "not marked",
                  holiday ? `holiday: ${holiday}` : null,
                ]
                  .filter(Boolean)
                  .join(", ")}
                className={cn(
                  "relative aspect-square rounded-xl border text-sm transition-colors",
                  outside || past
                    ? "cursor-not-allowed border-transparent text-ink-faint/40"
                    : "border-transparent hover:border-border-strong",
                  style?.cell,
                  inPreview && !style ? "border-primary/50 bg-primary-soft/60" : null,
                  anchor === day ? "ring-2 ring-primary" : null,
                  isToday(date) && !state ? "font-semibold text-primary" : null,
                )}
              >
                <span>{format(date, "d")}</span>
                {holiday && !outside ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-0 bottom-1 mx-auto h-1 w-1 rounded-full bg-accent"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-faint">
        {MODES.map((option) => (
          <span key={option.value} className="flex items-center gap-1.5">
            <span aria-hidden className={cn("h-2.5 w-2.5 rounded-full", option.dot)} />
            {option.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-accent" />
          Public holiday
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {holidayState === "loading" ? <Skeleton className="h-14 w-full" /> : null}

        {holidayState === "degraded" ? (
          <Notice tone="warning">
            We could not load the full holiday list right now, so some holiday markers may be
            missing. You can still pick your dates.
          </Notice>
        ) : null}

        {relevantLongWeekends.map((window) => (
          <div
            key={`${window.start}-${window.end}`}
            className="flex items-start gap-3 rounded-2xl border border-border bg-surface-muted/60 p-3"
          >
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
            <div className="flex-1 text-sm">
              <p className="font-medium">
                {format(parseISO(window.start), "d MMM")} to{" "}
                {format(parseISO(window.end), "d MMM")} is a {window.days}-day opportunity.
              </p>
              <p className="text-ink-soft">{window.label}</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                const next = new Map(days);
                for (const date of eachDayOfInterval({
                  start: parseISO(window.start),
                  end: parseISO(window.end),
                })) {
                  next.set(iso(date), "preferred");
                }
                onChange(toValue(next));
              }}
            >
              Mark ideal
            </Button>
          </div>
        ))}

        {holidayState !== "loading" && relevantLongWeekends.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-ink-faint">
            <CalendarDays className="h-4 w-4" aria-hidden />
            No long weekends fall in these two months.
          </p>
        ) : null}
      </div>
    </div>
  );
}
