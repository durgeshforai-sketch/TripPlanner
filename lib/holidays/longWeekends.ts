import { addDays, differenceInCalendarDays, format, isWeekend, parseISO } from "date-fns";
import type { Holiday } from "@/lib/providers/types";
import type { DateRange } from "@/types/preferences";

export interface LongWeekend {
  start: string;
  end: string;
  days: number;
  holidays: { date: string; name: string }[];
  /** Working days you would need to take off to join two breaks together. */
  bridgeDays: string[];
  /** Extension made possible by days the member already marked available. */
  extended: { start: string; end: string; days: number } | null;
  label: string;
}

export const iso = (date: Date): string => format(date, "yyyy-MM-dd");

export function eachDay(start: string, end: string): string[] {
  const from = parseISO(start);
  const total = differenceInCalendarDays(parseISO(end), from);
  if (total < 0) return [];
  return Array.from({ length: total + 1 }, (_, i) => iso(addDays(from, i)));
}

export function rangesToDaySet(ranges: DateRange[]): Set<string> {
  const set = new Set<string>();
  for (const range of ranges) for (const day of eachDay(range.start, range.end)) set.add(day);
  return set;
}

export function isDayOff(day: string, holidayByDate: Map<string, string>): boolean {
  return holidayByDate.has(day) || isWeekend(parseISO(day));
}

/**
 * Long weekends are derived, never fetched: a run of consecutive non-working
 * days (weekend or public holiday) of three days or more is an opportunity.
 * A single working day between two such runs is reported as a bridge day, and
 * days the member already marked available extend the window further.
 */
export function findLongWeekends(
  holidays: Holiday[],
  options: {
    from: string;
    to: string;
    /** Days the member said they could travel; used only to extend a window. */
    availability?: DateRange[];
    minDays?: number;
  },
): LongWeekend[] {
  const { from, to, availability = [], minDays = 3 } = options;
  const holidayByDate = new Map(holidays.map((h) => [h.date, h.localName || h.name]));
  const available = rangesToDaySet(availability);
  const days = eachDay(from, to);
  if (days.length === 0) return [];

  // 1. Consecutive runs of non-working days.
  const runs: string[][] = [];
  let current: string[] = [];
  for (const day of days) {
    if (isDayOff(day, holidayByDate)) {
      current.push(day);
    } else if (current.length > 0) {
      runs.push(current);
      current = [];
    }
  }
  if (current.length > 0) runs.push(current);

  const results: LongWeekend[] = [];

  for (const run of runs) {
    if (run.length < minDays) continue;
    results.push(buildLongWeekend(run, [], holidayByDate, available));
  }

  // 2. Runs separated by exactly one working day — a single day of leave joins them.
  for (let i = 0; i < runs.length - 1; i++) {
    const left = runs[i];
    const right = runs[i + 1];
    const gapStart = addDays(parseISO(left[left.length - 1]), 1);
    const gap = differenceInCalendarDays(parseISO(right[0]), parseISO(left[left.length - 1])) - 1;
    if (gap !== 1) continue;
    const bridge = iso(gapStart);
    const merged = [...left, bridge, ...right];
    if (merged.length < minDays + 1) continue;
    results.push(buildLongWeekend(merged, [bridge], holidayByDate, available));
  }

  return results
    .sort((a, b) => a.start.localeCompare(b.start))
    .filter((window, index, all) => all.findIndex((w) => w.start === window.start && w.end === window.end) === index);
}

function buildLongWeekend(
  run: string[],
  bridgeDays: string[],
  holidayByDate: Map<string, string>,
  available: Set<string>,
): LongWeekend {
  const start = run[0];
  const end = run[run.length - 1];

  // Extend into adjacent days the member already marked available (max 2 each side).
  let extStart = start;
  let extEnd = end;
  for (let i = 1; i <= 2; i++) {
    const candidate = iso(addDays(parseISO(extStart), -1));
    if (!available.has(candidate)) break;
    extStart = candidate;
  }
  for (let i = 1; i <= 2; i++) {
    const candidate = iso(addDays(parseISO(extEnd), 1));
    if (!available.has(candidate)) break;
    extEnd = candidate;
  }
  const extendedDays = differenceInCalendarDays(parseISO(extEnd), parseISO(extStart)) + 1;
  const extended =
    extendedDays > run.length ? { start: extStart, end: extEnd, days: extendedDays } : null;

  const holidays = run
    .filter((day) => holidayByDate.has(day))
    .map((day) => ({ date: day, name: holidayByDate.get(day) ?? "Holiday" }));

  return {
    start,
    end,
    days: run.length,
    holidays,
    bridgeDays,
    extended,
    label: buildLabel(run.length, bridgeDays, extended),
  };
}

function buildLabel(
  days: number,
  bridgeDays: string[],
  extended: { days: number } | null,
): string {
  if (bridgeDays.length > 0) {
    const day = format(parseISO(bridgeDays[0]), "EEEE");
    return `${days}-day break if you take ${day} off`;
  }
  if (extended) return `${days}-day weekend, or ${extended.days} days with your free days`;
  return `${days}-day weekend`;
}
