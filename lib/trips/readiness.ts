import type { Member, Trip } from "@/types/trip";
import type { Preference } from "@/types/preferences";

export interface TripReadiness {
  /** How many people the organiser said were coming. */
  expected: number;
  joined: number;
  submitted: number;
  /** People who have joined but not finished their preferences. */
  pendingMembers: Member[];
  /** Invitees who have not opened the link at all yet. */
  awaitingJoiners: number;

  everyoneJoined: boolean;
  everyoneSubmitted: boolean;

  /** True when the group is genuinely complete. */
  canGenerate: boolean;
  /**
   * True when the organiser could reasonably choose to go ahead without the
   * stragglers. Deliberately separate from `canGenerate` so going early is
   * always a decision someone makes, never something that happens by accident.
   */
  canGenerateAnyway: boolean;
  /** Plain-language reason the group is not ready, or null when it is. */
  blockReason: string | null;

  /** Someone submitted after the latest run, so the options on screen are stale. */
  hasStaleRun: boolean;
  /** Members who submitted after the run that produced the current options. */
  membersMissingFromRun: Member[];
}

function list(names: string[]): string {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * One place that decides whether a trip is ready for recommendations.
 *
 * The important rule: readiness is measured against the number of people the
 * organiser said were coming, not against whoever happens to have joined so
 * far. Measuring against joiners meant a trip for five could generate its
 * options as soon as the first two had answered, which then locked everyone
 * else out of the preference flow.
 */
export function assessReadiness(input: {
  trip: Trip;
  members: Member[];
  preferences: Preference[];
  runCreatedAt?: string | null;
}): TripReadiness {
  const { trip, members, preferences, runCreatedAt = null } = input;

  const submittedByMember = new Map(
    preferences.filter((p) => p.submittedAt !== null).map((p) => [p.memberId, p]),
  );

  const pendingMembers = members.filter((member) => !submittedByMember.has(member.id));
  const expected = Math.max(trip.expectedMembers, members.length);
  const awaitingJoiners = Math.max(0, expected - members.length);

  const everyoneJoined = awaitingJoiners === 0;
  const everyoneSubmitted = members.length > 0 && pendingMembers.length === 0;

  let blockReason: string | null = null;
  if (!everyoneJoined && !everyoneSubmitted) {
    blockReason = `Still waiting for ${list(pendingMembers.map((m) => m.name))} to answer, and ${awaitingJoiners} more ${awaitingJoiners === 1 ? "person has" : "people have"} not joined yet.`;
  } else if (!everyoneJoined) {
    blockReason = `${awaitingJoiners} of the ${expected} people you invited ${awaitingJoiners === 1 ? "has" : "have"} not joined yet.`;
  } else if (!everyoneSubmitted) {
    blockReason = `Still waiting for ${list(pendingMembers.map((m) => m.name))} to answer.`;
  }

  const membersMissingFromRun = runCreatedAt
    ? members.filter((member) => {
        const submittedAt = submittedByMember.get(member.id)?.submittedAt;
        return submittedAt !== undefined && submittedAt !== null && submittedAt > runCreatedAt;
      })
    : [];

  return {
    expected,
    joined: members.length,
    submitted: submittedByMember.size,
    pendingMembers,
    awaitingJoiners,
    everyoneJoined,
    everyoneSubmitted,
    canGenerate: everyoneJoined && everyoneSubmitted,
    // Two answers is the minimum for a group decision to mean anything.
    canGenerateAnyway: submittedByMember.size >= 2,
    blockReason,
    hasStaleRun: membersMissingFromRun.length > 0,
    membersMissingFromRun,
  };
}
