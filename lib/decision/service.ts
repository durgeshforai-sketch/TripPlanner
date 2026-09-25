import "server-only";
import { castVote, ensureDecision, getLatestRun, listVotes, updateDecision } from "@/lib/db/repo";
import { badRequest, conflict, notFound } from "@/lib/errors";
import type { Member } from "@/types/trip";
import type { DecisionState } from "@/types/recommendation";

/**
 * The app is a decision-support tool: it counts votes and shows the split, but
 * it never picks the winner on the group's behalf. A tie opens a second round
 * between the tied options rather than being broken automatically.
 */
export async function getDecisionState(
  tripId: string,
  members: Member[],
): Promise<DecisionState> {
  const decision = await ensureDecision(tripId);
  const votes = await listVotes(tripId, decision.round);
  const voteByMember = new Map(votes.map((v) => [v.member_id, v.option_id]));

  const tally = new Map<string, number>();
  for (const vote of votes) tally.set(vote.option_id, (tally.get(vote.option_id) ?? 0) + 1);

  const counts = Array.from(tally.entries()).map(([optionId, count]) => ({ optionId, count }));
  counts.sort((a, b) => b.count - a.count);

  const top = counts[0]?.count ?? 0;
  const tiedOptionIds = top > 0 ? counts.filter((c) => c.count === top).map((c) => c.optionId) : [];

  return {
    status: decision.status as DecisionState["status"],
    selectedOptionId: decision.selected_option_id,
    votes: members.map((member) => ({
      memberId: member.id,
      memberName: member.name,
      optionId: voteByMember.get(member.id) ?? null,
    })),
    tally: counts,
    tiedOptionIds: tiedOptionIds.length > 1 ? tiedOptionIds : [],
  };
}

export async function recordVote(
  tripId: string,
  memberId: string,
  optionId: string,
): Promise<void> {
  const run = await getLatestRun(tripId);
  if (!run) throw notFound("There are no options to vote on yet.");

  const decision = await ensureDecision(tripId);
  if (decision.status === "final") throw conflict("Your group has already decided.");

  const allowed =
    decision.status === "runoff" && Array.isArray(decision.runoff_option_ids)
      ? new Set(decision.runoff_option_ids.filter((id): id is string => typeof id === "string"))
      : new Set(run.options.map((option) => option.id));

  if (!allowed.has(optionId)) throw badRequest("That option is not on the ballot.");

  await castVote({ tripId, memberId, optionId, round: decision.round });
}

export interface FinalizeResult {
  outcome: "decided" | "runoff" | "incomplete";
  selectedOptionId: string | null;
  tiedOptionIds: string[];
  missingMembers: string[];
}

export async function finalizeDecision(
  tripId: string,
  members: Member[],
): Promise<FinalizeResult> {
  const decision = await ensureDecision(tripId);
  const state = await getDecisionState(tripId, members);

  const missing = state.votes.filter((v) => v.optionId === null).map((v) => v.memberName);
  if (missing.length > 0) {
    return {
      outcome: "incomplete",
      selectedOptionId: null,
      tiedOptionIds: [],
      missingMembers: missing,
    };
  }

  if (state.tiedOptionIds.length > 1) {
    // One runoff only. If the group ties again they need to talk, not vote more.
    if (decision.status === "runoff") {
      return {
        outcome: "runoff",
        selectedOptionId: null,
        tiedOptionIds: state.tiedOptionIds,
        missingMembers: [],
      };
    }
    await updateDecision(tripId, {
      status: "runoff",
      round: decision.round + 1,
      runoffOptionIds: state.tiedOptionIds,
    });
    return {
      outcome: "runoff",
      selectedOptionId: null,
      tiedOptionIds: state.tiedOptionIds,
      missingMembers: [],
    };
  }

  const winner = state.tally[0]?.optionId ?? null;
  if (!winner) {
    return { outcome: "incomplete", selectedOptionId: null, tiedOptionIds: [], missingMembers: [] };
  }

  await updateDecision(tripId, { status: "final", selectedOptionId: winner });
  return { outcome: "decided", selectedOptionId: winner, tiedOptionIds: [], missingMembers: [] };
}
