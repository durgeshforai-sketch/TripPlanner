import { buildCandidatePool } from "./candidates";
import { buildCandidateWindows, type CandidateWindow } from "./dates";
import { PLANNING, THRESHOLDS } from "./config";
import { evaluateMember, scoreGroup, type MemberEvaluation } from "./scoring";
import { estimateTravel, resolveOrigins, type ResolvedOrigin, type TravelEstimate } from "./travel";
import type { Destination } from "@/types/destination";
import type { Preference } from "@/types/preferences";

export interface ScoredCandidate {
  destination: Destination;
  window: CandidateWindow;
  evaluations: MemberEvaluation[];
  groupScore: number;
  membersSatisfied: number;
}

export interface Shortlist {
  candidates: ScoredCandidate[];
  origins: ResolvedOrigin[];
  originByMember: Map<string, ResolvedOrigin>;
  /** Set when we could not produce a full shortlist, with a plain-language why. */
  shortfallReason: string | null;
}

/**
 * Pure deterministic selection: no network, no database. Everything the group
 * sees at the top of the results page is decided here, which is also what makes
 * the ranking testable.
 */
export function selectShortlist(
  preferences: Preference[],
  options: { today?: Date; size?: number } = {},
): Shortlist {
  const size = options.size ?? PLANNING.shortlistSize;
  const windows = buildCandidateWindows(preferences, { today: options.today });
  const origins = resolveOrigins(preferences);
  const destinations = buildCandidatePool(preferences);

  const originByMember = new Map<string, ResolvedOrigin>();
  for (const origin of origins) {
    for (const memberId of origin.memberIds) originByMember.set(memberId, origin);
  }

  if (windows.length === 0 || destinations.length === 0) {
    return {
      candidates: [],
      origins,
      originByMember,
      shortfallReason:
        "We could not find a date range and destination combination that works with what everyone entered.",
    };
  }

  const travelCache = new Map<string, TravelEstimate | null>();
  const travelFor = (memberId: string, destination: Destination): TravelEstimate | null => {
    const key = `${memberId}:${destination.id}`;
    if (!travelCache.has(key)) {
      const origin = originByMember.get(memberId);
      travelCache.set(key, origin ? estimateTravel(origin, destination) : null);
    }
    return travelCache.get(key) ?? null;
  };

  const scored: ScoredCandidate[] = [];

  for (const destination of destinations) {
    for (const window of windows) {
      const availabilityByMember = new Map(
        window.members.map((entry) => [entry.memberId, entry.availability]),
      );

      const evaluations = preferences.map((preference) =>
        evaluateMember(preference, {
          destination,
          duration: window.duration,
          window: { start: window.start, end: window.end },
          availability: availabilityByMember.get(preference.memberId) ?? "unknown",
          travel: travelFor(preference.memberId, destination),
        }),
      );

      const blocked = evaluations.filter((e) => e.hardViolations.length > 0).length;
      if (blocked / evaluations.length > THRESHOLDS.disqualifyWhenHardViolationShareAbove) continue;

      const { groupScore, membersSatisfied } = scoreGroup({ evaluations });
      scored.push({ destination, window, evaluations, groupScore, membersSatisfied });
    }
  }

  if (scored.length === 0) {
    return {
      candidates: [],
      origins,
      originByMember,
      shortfallReason:
        "Every destination we looked at breaks a hard limit for most of the group — usually a budget maximum or a date clash. Loosening one of those will open things up.",
    };
  }

  const bestPerDestination = new Map<string, ScoredCandidate>();
  for (const candidate of scored) {
    const existing = bestPerDestination.get(candidate.destination.id);
    if (!existing || candidate.groupScore > existing.groupScore) {
      bestPerDestination.set(candidate.destination.id, candidate);
    }
  }

  const candidates = Array.from(bestPerDestination.values())
    .sort((a, b) => b.groupScore - a.groupScore || a.destination.name.localeCompare(b.destination.name))
    .slice(0, size);

  return {
    candidates,
    origins,
    originByMember,
    shortfallReason:
      candidates.length < size
        ? `We found ${candidates.length} ${candidates.length === 1 ? "destination" : "destinations"} that genuinely fit your group's limits. We would rather show fewer real options than pad the list.`
        : null,
  };
}
