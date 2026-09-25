import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { PLANNING } from "./config";
import { eachDay, iso, rangesToDaySet } from "@/lib/holidays/longWeekends";
import type { DateRange, Preference } from "@/types/preferences";

export type Availability = "preferred" | "possible" | "unknown" | "unavailable";

export interface MemberWindowFit {
  memberId: string;
  availability: Availability;
}

export interface CandidateWindow {
  start: string;
  end: string;
  duration: number;
  members: MemberWindowFit[];
  preferredCount: number;
  possibleCount: number;
  unavailableCount: number;
  /** 0-1 measure of how well the window suits the group, before destinations. */
  score: number;
}

const AVAILABILITY_VALUE: Record<Availability, number> = {
  preferred: 1,
  possible: 0.7,
  unknown: 0.35,
  unavailable: 0,
};

interface MemberCalendar {
  memberId: string;
  preferred: Set<string>;
  possible: Set<string>;
  unavailable: Set<string>;
  hasAnyDates: boolean;
}

export function buildMemberCalendars(preferences: Preference[]): MemberCalendar[] {
  return preferences.map((preference) => {
    const preferred = rangesToDaySet(preference.preferredDates);
    const possible = rangesToDaySet(preference.possibleDates);
    const unavailable = rangesToDaySet(preference.unavailableDates);
    return {
      memberId: preference.memberId,
      preferred,
      possible,
      unavailable,
      hasAnyDates: preferred.size > 0 || possible.size > 0,
    };
  });
}

function availabilityFor(calendar: MemberCalendar, days: string[]): Availability {
  if (days.some((day) => calendar.unavailable.has(day))) return "unavailable";
  if (!calendar.hasAnyDates) return "unknown";
  if (days.every((day) => calendar.preferred.has(day))) return "preferred";
  const covered = days.filter(
    (day) => calendar.preferred.has(day) || calendar.possible.has(day),
  ).length;
  if (covered === days.length) return "possible";
  // Partially covered windows are weaker than fully possible ones but are not
  // ruled out — the member simply did not say anything about those days.
  return covered / days.length >= 0.6 ? "possible" : "unknown";
}

/**
 * Candidate durations the whole group could live with. When members' minimum
 * and maximum lengths do not overlap at all we fall back to the median ideal
 * length and let per-member scoring surface the mismatch.
 */
export function candidateDurations(preferences: Preference[]): number[] {
  if (preferences.length === 0) return [];
  const groupMin = Math.max(...preferences.map((p) => p.minDays));
  const groupMax = Math.min(...preferences.map((p) => p.maxDays));
  const ideals = preferences.map((p) => p.preferredDays).sort((a, b) => a - b);
  const median = ideals[Math.floor(ideals.length / 2)];

  if (groupMin > groupMax) {
    const spread = [median, median - 1, median + 1].filter((d) => d >= 1);
    return unique(spread).slice(0, PLANNING.maxCandidateDurations);
  }

  const clamp = (value: number) => Math.min(groupMax, Math.max(groupMin, value));
  return unique([clamp(median), groupMin, groupMax]).slice(0, PLANNING.maxCandidateDurations);
}

function unique(values: number[]): number[] {
  return Array.from(new Set(values.filter((v) => v >= 1 && v <= 60)));
}

/**
 * Slides each candidate duration across every day anyone marked as preferred or
 * possible, scores the window against the whole group and keeps the best few.
 * When nobody entered dates it falls back to a rolling horizon.
 */
export function buildCandidateWindows(
  preferences: Preference[],
  options: { today?: Date; limit?: number } = {},
): CandidateWindow[] {
  const { today = new Date(), limit = PLANNING.maxCandidateWindows } = options;
  const calendars = buildMemberCalendars(preferences);
  const durations = candidateDurations(preferences);
  if (durations.length === 0) return [];

  const earliest = iso(addDays(today, PLANNING.minLeadDays));

  const mentioned = new Set<string>();
  for (const preference of preferences) {
    for (const range of [...preference.preferredDates, ...preference.possibleDates]) {
      for (const day of eachDay(range.start, range.end)) mentioned.add(day);
    }
  }

  const starts =
    mentioned.size > 0
      ? Array.from(mentioned).filter((day) => day >= earliest)
      : eachDay(earliest, iso(addDays(today, PLANNING.fallbackHorizonDays)));

  const windows: CandidateWindow[] = [];

  for (const duration of durations) {
    for (const start of starts.sort()) {
      const end = iso(addDays(parseISO(start), duration - 1));
      const days = eachDay(start, end);
      if (days.length !== duration) continue;

      const members = calendars.map((calendar) => ({
        memberId: calendar.memberId,
        availability: availabilityFor(calendar, days),
      }));

      const preferredCount = members.filter((m) => m.availability === "preferred").length;
      const possibleCount = members.filter((m) => m.availability === "possible").length;
      const unavailableCount = members.filter((m) => m.availability === "unavailable").length;

      const raw =
        members.reduce((sum, m) => sum + AVAILABILITY_VALUE[m.availability], 0) / members.length;

      windows.push({
        start,
        end,
        duration,
        members,
        preferredCount,
        possibleCount,
        unavailableCount,
        score: raw,
      });
    }
  }

  return pickDistinct(windows, limit);
}

/** Keeps the strongest windows while avoiding near-identical overlapping dates. */
function pickDistinct(windows: CandidateWindow[], limit: number): CandidateWindow[] {
  const sorted = [...windows].sort(
    (a, b) => b.score - a.score || a.start.localeCompare(b.start) || a.duration - b.duration,
  );
  const chosen: CandidateWindow[] = [];

  for (const window of sorted) {
    if (chosen.length >= limit) break;
    const tooClose = chosen.some(
      (existing) =>
        existing.duration === window.duration &&
        Math.abs(differenceInCalendarDays(parseISO(existing.start), parseISO(window.start))) < 3,
    );
    if (tooClose) continue;
    chosen.push(window);
  }

  return chosen;
}

export interface DateOverlap {
  /** Days everyone who entered dates offered, ignoring unavailability. */
  shared: DateRange[];
  /** The subset of `shared` that nobody has marked unavailable. */
  clear: DateRange[];
  /** Members whose unavailability is what blocks the rest of `shared`. */
  blockingMemberIds: string[];
  /** How many members offered every day in `shared`. */
  sharedMemberCount: number;
  /** True when that is the whole group, not just the largest subset. */
  isFullConsensus: boolean;
}

/**
 * Separating "days everyone offered" from "days nobody blocked" is what lets the
 * product say *who* is blocking a window instead of silently returning nothing.
 */
export function analyseDateOverlap(preferences: Preference[]): DateOverlap {
  const calendars = buildMemberCalendars(preferences);
  const withDates = calendars.filter((c) => c.hasAnyDates);
  if (withDates.length === 0) {
    return {
      shared: [],
      clear: [],
      blockingMemberIds: [],
      sharedMemberCount: 0,
      isFullConsensus: false,
    };
  }

  const counts = new Map<string, number>();
  for (const calendar of withDates) {
    for (const day of new Set([...calendar.preferred, ...calendar.possible])) {
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }
  }

  // Fall back to the largest agreeing subset when nothing suits everyone, so
  // the group can still be told who is outside the window.
  const bestCount = Math.max(0, ...counts.values());
  const sharedDays = Array.from(counts.entries())
    .filter(([, count]) => count === bestCount)
    .map(([day]) => day)
    .sort();

  const blockingMemberIds = new Set<string>();
  const clearDays = sharedDays.filter((day) => {
    const blockers = calendars.filter((calendar) => calendar.unavailable.has(day));
    for (const blocker of blockers) blockingMemberIds.add(blocker.memberId);
    return blockers.length === 0;
  });

  return {
    shared: groupConsecutive(sharedDays),
    clear: groupConsecutive(clearDays),
    blockingMemberIds: Array.from(blockingMemberIds),
    sharedMemberCount: bestCount,
    isFullConsensus: bestCount === withDates.length,
  };
}

export function groupConsecutive(days: string[]): DateRange[] {
  const ranges: DateRange[] = [];
  let start: string | null = null;
  let previous: string | null = null;

  for (const day of days) {
    if (start === null || previous === null) {
      start = day;
      previous = day;
      continue;
    }
    const gap = differenceInCalendarDays(parseISO(day), parseISO(previous));
    if (gap === 1) {
      previous = day;
    } else {
      ranges.push({ start, end: previous });
      start = day;
      previous = day;
    }
  }
  if (start && previous) ranges.push({ start, end: previous });
  return ranges;
}

export function formatRange(range: DateRange): string {
  const start = parseISO(range.start);
  const end = parseISO(range.end);
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  return sameMonth
    ? `${format(start, "d")}–${format(end, "d MMM yyyy")}`
    : `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`;
}
