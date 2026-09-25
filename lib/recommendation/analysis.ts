import { DEAL_BREAKER_RULES } from "./config";
import { analyseDateOverlap, formatRange } from "./dates";
import { resolveOrigins } from "./travel";
import { formatINR } from "@/lib/utils";
import { TRIP_STYLE_LABELS, type Preference, type TripStyle } from "@/types/preferences";
import type { Member } from "@/types/trip";
import type { GroupSnapshot } from "@/types/recommendation";

/**
 * Turns individual preferences into the plain-language picture the group sees
 * before any destination is proposed: where they agree, and where they do not.
 */
export function buildGroupSnapshot(
  preferences: Preference[],
  members: Member[],
  excludedMembers: Member[] = [],
): GroupSnapshot {
  const nameById = new Map(members.map((m) => [m.id, m.name]));
  const memberName = (id: string): string => nameById.get(id) ?? "Someone";

  const comfortable = preferences.map((p) => p.comfortableBudget);
  const maximums = preferences.map((p) => p.maximumBudget);
  const lowestMaximum = maximums.length > 0 ? Math.min(...maximums) : 0;
  const highestComfortable = comfortable.length > 0 ? Math.max(...comfortable) : 0;
  const lowestComfortable = comfortable.length > 0 ? Math.min(...comfortable) : 0;

  // Everyone can afford a trip priced in this band.
  const overlapLow = lowestComfortable;
  const overlapHigh = lowestMaximum;
  const budgetOverlapExists = overlapHigh >= overlapLow;
  // A clash is not "no affordable price exists" — it is one person wanting to
  // spend more than another person's ceiling.
  const budgetTension = highestComfortable > lowestMaximum;

  const dateOverlap = analyseDateOverlap(preferences);
  // Prefer a window nobody has blocked; fall back to what everyone offered so
  // the group still sees the shape of their agreement.
  const overlap = dateOverlap.clear.length > 0 ? dateOverlap.clear : dateOverlap.shared;

  const blockedIds = new Set(dateOverlap.blockingMemberIds);
  const membersWithNoOverlap = preferences
    .filter((preference) => {
      if (blockedIds.has(preference.memberId)) return true;
      if (dateOverlap.shared.length === 0) return false;
      const own = [...preference.preferredDates, ...preference.possibleDates];
      if (own.length === 0) return false;
      return !dateOverlap.shared.some((range) =>
        own.some((entry) => entry.start <= range.end && range.start <= entry.end),
      );
    })
    .map((p) => ({ memberId: p.memberId, memberName: memberName(p.memberId) }));

  const styleCounts = new Map<TripStyle, { count: number; mustCount: number }>();
  for (const preference of preferences) {
    for (const style of preference.tripStyles) {
      if (style.priority === "dont-care") continue;
      const entry = styleCounts.get(style.style) ?? { count: 0, mustCount: 0 };
      entry.count += 1;
      if (style.priority === "must") entry.mustCount += 1;
      styleCounts.set(style.style, entry);
    }
  }

  const topStyles = Array.from(styleCounts.entries())
    .map(([style, value]) => ({ style, ...value }))
    .sort((a, b) => b.mustCount - a.mustCount || b.count - a.count)
    .slice(0, 5);

  const minDays = preferences.length > 0 ? Math.max(...preferences.map((p) => p.minDays)) : 0;
  const maxDays = preferences.length > 0 ? Math.min(...preferences.map((p) => p.maxDays)) : 0;
  const preferredDays = preferences.map((p) => p.preferredDays).sort((a, b) => a - b);
  const consensusDuration =
    minDays <= maxDays && preferredDays.length > 0
      ? Math.min(maxDays, Math.max(minDays, preferredDays[Math.floor(preferredDays.length / 2)]))
      : null;

  const scope = {
    domestic: preferences.filter((p) => p.travelScope === "domestic").length,
    international: preferences.filter((p) => p.travelScope === "international").length,
    either: preferences.filter((p) => p.travelScope === "either").length,
    resolved: resolveScope(preferences),
  };

  const origins = resolveOrigins(preferences).map((origin) => ({
    city: origin.city,
    memberIds: origin.memberIds,
  }));

  const conflicts = buildConflicts({
    preferences,
    memberName,
    budgetTension,
    lowestMaximum,
    highestComfortable,
    overlapCount: overlap.length,
    membersWithNoOverlap,
    minDays,
    maxDays,
    styleCounts,
  });

  const headlines = buildHeadlines({
    consensusDuration,
    overlapLow,
    overlapHigh,
    budgetOverlapExists,
    overlap:
      overlap.length > 0 && dateOverlap.isFullConsensus ? formatRange(overlap[0]) : null,
    topStyles,
    memberCount: members.length,
  });

  return {
    memberCount: members.length,
    submittedCount: preferences.length,
    excludedMembers: excludedMembers.map((member) => member.name),
    budget: {
      comfortableMin: lowestComfortable,
      comfortableMax: highestComfortable,
      lowestMaximum,
      overlapLow: budgetOverlapExists ? overlapLow : null,
      overlapHigh: budgetOverlapExists ? overlapHigh : null,
    },
    dates: { overlapRanges: overlap, membersWithNoOverlap },
    duration: { min: minDays, max: maxDays, consensus: consensusDuration },
    topStyles,
    commonMustHaves: tally(preferences.flatMap((p) => p.mustHaves)),
    commonDealBreakers: tally(preferences.flatMap((p) => p.dealBreakers)),
    commonDestinations: tally(
      preferences.flatMap((p) => p.desiredDestinations.map((d) => d.name)),
    ).map((entry) => ({ name: entry.value, count: entry.count })),
    scope,
    origins,
    conflicts,
    headlines,
  };
}

function resolveScope(preferences: Preference[]): "domestic" | "international" | "either" {
  const domestic = preferences.filter((p) => p.travelScope === "domestic").length;
  const international = preferences.filter((p) => p.travelScope === "international").length;
  if (domestic > 0 && international === 0) return "domestic";
  if (international > 0 && domestic === 0) return "international";
  return "either";
}

function tally(values: string[]): { value: string; count: number }[] {
  const counts = new Map<string, { value: string; count: number }>();
  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    const entry = counts.get(key) ?? { value, count: 0 };
    entry.count += 1;
    counts.set(key, entry);
  }
  return Array.from(counts.values()).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

interface ConflictInput {
  preferences: Preference[];
  memberName: (id: string) => string;
  budgetTension: boolean;
  lowestMaximum: number;
  highestComfortable: number;
  overlapCount: number;
  membersWithNoOverlap: { memberId: string; memberName: string }[];
  minDays: number;
  maxDays: number;
  styleCounts: Map<TripStyle, { count: number; mustCount: number }>;
}

function buildConflicts(input: ConflictInput): string[] {
  const conflicts: string[] = [];

  if (input.budgetTension) {
    conflicts.push(
      `Budgets do not fully overlap — one member's maximum is ${formatINR(input.lowestMaximum)} while another is comfortable at ${formatINR(input.highestComfortable)}.`,
    );
  }

  if (input.overlapCount === 0 && input.preferences.some((p) => p.preferredDates.length > 0)) {
    conflicts.push("There is no single date range that everyone marked as free.");
  }

  for (const member of input.membersWithNoOverlap) {
    conflicts.push(`${member.memberName} cannot travel on the dates the rest of the group picked.`);
  }

  if (input.minDays > input.maxDays) {
    conflicts.push(
      `Trip length does not line up — someone needs at least ${input.minDays} days while someone else can only manage ${input.maxDays}.`,
    );
  }

  const strongStyles = Array.from(input.styleCounts.entries()).filter(([, v]) => v.mustCount > 0);
  if (strongStyles.length >= 2) {
    const [first, second] = strongStyles.sort((a, b) => b[1].mustCount - a[1].mustCount);
    if (first[0] !== second[0] && second[1].mustCount > 0) {
      conflicts.push(
        `${first[1].mustCount} ${plural(first[1].mustCount)} set on ${TRIP_STYLE_LABELS[first[0]].toLowerCase()}, ${second[1].mustCount} on ${TRIP_STYLE_LABELS[second[0]].toLowerCase()}.`,
      );
    }
  }

  const scopeSplit = {
    domestic: input.preferences.filter((p) => p.travelScope === "domestic").length,
    international: input.preferences.filter((p) => p.travelScope === "international").length,
  };
  if (scopeSplit.domestic > 0 && scopeSplit.international > 0) {
    conflicts.push(
      `${scopeSplit.domestic} want to stay in the country, ${scopeSplit.international} want to go abroad.`,
    );
  }

  // Deal-breakers we cannot check become booking notes rather than silent gaps.
  const notes = new Set<string>();
  for (const preference of input.preferences) {
    for (const dealBreaker of preference.dealBreakers) {
      const rule = DEAL_BREAKER_RULES[dealBreaker.trim().toLowerCase()];
      if (rule?.kind === "not-evaluable" && rule.note) notes.add(rule.note);
    }
  }
  for (const note of notes) conflicts.push(`Worth remembering when booking: ${note.toLowerCase()}.`);

  return conflicts;
}

function plural(count: number): string {
  return count === 1 ? "person is" : "people are";
}

interface HeadlineInput {
  consensusDuration: number | null;
  overlapLow: number;
  overlapHigh: number;
  budgetOverlapExists: boolean;
  overlap: string | null;
  topStyles: { style: TripStyle; count: number; mustCount: number }[];
  memberCount: number;
}

function buildHeadlines(input: HeadlineInput): string[] {
  const headlines: string[] = [];

  if (input.consensusDuration && input.budgetOverlapExists) {
    headlines.push(
      `Your group has strong overlap on ${input.consensusDuration}-day trips and budgets between ${formatINR(input.overlapLow)} and ${formatINR(input.overlapHigh)}.`,
    );
  } else if (input.consensusDuration) {
    headlines.push(`Your group broadly agrees on a ${input.consensusDuration}-day trip.`);
  }

  if (input.overlap) headlines.push(`Everyone is free around ${input.overlap}.`);

  const top = input.topStyles[0];
  if (top) {
    headlines.push(
      `${top.count} of ${input.memberCount} want a ${TRIP_STYLE_LABELS[top.style].toLowerCase()} trip.`,
    );
  }
  const second = input.topStyles[1];
  if (second && second.mustCount > 0) {
    headlines.push(
      second.mustCount === 1
        ? `One of you is set on ${TRIP_STYLE_LABELS[second.style].toLowerCase()}.`
        : `${second.mustCount} are set on ${TRIP_STYLE_LABELS[second.style].toLowerCase()}.`,
    );
  }

  return headlines;
}
