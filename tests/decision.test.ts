import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Member } from "@/types/trip";

interface VoteRow {
  trip_id: string;
  member_id: string;
  option_id: string;
  round: number;
}

const state = {
  decision: {
    trip_id: "trip-1",
    status: "open" as "open" | "runoff" | "final",
    round: 1,
    selected_option_id: null as string | null,
    runoff_option_ids: [] as string[],
  },
  votes: [] as VoteRow[],
  options: ["opt-a", "opt-b", "opt-c"],
};

vi.mock("@/lib/db/repo", () => ({
  ensureDecision: vi.fn(async () => state.decision),
  listVotes: vi.fn(async (_tripId: string, round: number) =>
    state.votes.filter((vote) => vote.round === round),
  ),
  castVote: vi.fn(
    async (input: { tripId: string; memberId: string; optionId: string; round: number }) => {
      state.votes = state.votes.filter(
        (vote) => !(vote.member_id === input.memberId && vote.round === input.round),
      );
      state.votes.push({
        trip_id: input.tripId,
        member_id: input.memberId,
        option_id: input.optionId,
        round: input.round,
      });
    },
  ),
  updateDecision: vi.fn(
    async (
      _tripId: string,
      patch: {
        status?: "open" | "runoff" | "final";
        round?: number;
        selectedOptionId?: string | null;
        runoffOptionIds?: string[];
      },
    ) => {
      if (patch.status !== undefined) state.decision.status = patch.status;
      if (patch.round !== undefined) state.decision.round = patch.round;
      if (patch.selectedOptionId !== undefined) {
        state.decision.selected_option_id = patch.selectedOptionId;
      }
      if (patch.runoffOptionIds !== undefined) {
        state.decision.runoff_option_ids = patch.runoffOptionIds;
      }
    },
  ),
  getLatestRun: vi.fn(async () => ({
    id: "run-1",
    options: state.options.map((id) => ({ id })),
  })),
}));

const { finalizeDecision, getDecisionState, recordVote } = await import("@/lib/decision/service");
const { AppError } = await import("@/lib/errors");

const MEMBERS: Member[] = ["Palak", "Riya", "Siddharth", "Karan"].map((name, index) => ({
  id: `m-${index}`,
  tripId: "trip-1",
  name,
  role: index === 0 ? "owner" : "participant",
  status: "submitted",
  createdAt: "",
  updatedAt: "",
}));

async function voteAll(picks: string[]) {
  for (const [index, optionId] of picks.entries()) {
    await recordVote("trip-1", MEMBERS[index].id, optionId);
  }
}

beforeEach(() => {
  state.decision = {
    trip_id: "trip-1",
    status: "open",
    round: 1,
    selected_option_id: null,
    runoff_option_ids: [],
  };
  state.votes = [];
});

describe("voting", () => {
  it("records one vote per member and shows the split", async () => {
    await voteAll(["opt-a", "opt-a", "opt-b", "opt-a"]);
    const decision = await getDecisionState("trip-1", MEMBERS);
    expect(decision.tally[0]).toEqual({ optionId: "opt-a", count: 3 });
    expect(decision.votes.map((v) => v.optionId)).toEqual([
      "opt-a",
      "opt-a",
      "opt-b",
      "opt-a",
    ]);
  });

  it("lets someone change their mind without double counting", async () => {
    await recordVote("trip-1", "m-0", "opt-a");
    await recordVote("trip-1", "m-0", "opt-b");
    const decision = await getDecisionState("trip-1", MEMBERS);
    expect(decision.tally).toEqual([{ optionId: "opt-b", count: 1 }]);
  });

  it("rejects a vote for something not on the ballot", async () => {
    await expect(recordVote("trip-1", "m-0", "opt-z")).rejects.toBeInstanceOf(AppError);
  });

  it("shows who has not voted yet", async () => {
    await voteAll(["opt-a", "opt-a"]);
    const decision = await getDecisionState("trip-1", MEMBERS);
    expect(decision.votes.filter((v) => v.optionId === null).map((v) => v.memberName)).toEqual([
      "Siddharth",
      "Karan",
    ]);
  });
});

describe("closing the vote", () => {
  it("refuses to decide before everyone has voted", async () => {
    await voteAll(["opt-a", "opt-a", "opt-b"]);
    const result = await finalizeDecision("trip-1", MEMBERS);
    expect(result.outcome).toBe("incomplete");
    expect(result.missingMembers).toEqual(["Karan"]);
    expect(state.decision.status).toBe("open");
  });

  it("selects the clear winner", async () => {
    await voteAll(["opt-a", "opt-a", "opt-b", "opt-a"]);
    const result = await finalizeDecision("trip-1", MEMBERS);
    expect(result.outcome).toBe("decided");
    expect(result.selectedOptionId).toBe("opt-a");
    expect(state.decision.status).toBe("final");
  });

  it("opens a runoff on a tie instead of picking for the group", async () => {
    await voteAll(["opt-a", "opt-a", "opt-b", "opt-b"]);
    const result = await finalizeDecision("trip-1", MEMBERS);
    expect(result.outcome).toBe("runoff");
    expect(result.selectedOptionId).toBeNull();
    expect(result.tiedOptionIds.sort()).toEqual(["opt-a", "opt-b"]);
    expect(state.decision.status).toBe("runoff");
    expect(state.decision.round).toBe(2);
  });

  it("resolves the runoff round", async () => {
    await voteAll(["opt-a", "opt-a", "opt-b", "opt-b"]);
    await finalizeDecision("trip-1", MEMBERS);

    await voteAll(["opt-a", "opt-a", "opt-a", "opt-b"]);
    const result = await finalizeDecision("trip-1", MEMBERS);
    expect(result.outcome).toBe("decided");
    expect(result.selectedOptionId).toBe("opt-a");
  });

  it("does not spiral into endless runoffs", async () => {
    await voteAll(["opt-a", "opt-a", "opt-b", "opt-b"]);
    await finalizeDecision("trip-1", MEMBERS);

    await voteAll(["opt-a", "opt-a", "opt-b", "opt-b"]);
    const result = await finalizeDecision("trip-1", MEMBERS);
    expect(result.outcome).toBe("runoff");
    // Still round 2 — the group needs to talk, not vote again.
    expect(state.decision.round).toBe(2);
  });

  it("only allows the tied options in a runoff", async () => {
    await voteAll(["opt-a", "opt-a", "opt-b", "opt-b"]);
    await finalizeDecision("trip-1", MEMBERS);
    await expect(recordVote("trip-1", "m-0", "opt-c")).rejects.toBeInstanceOf(AppError);
    await expect(recordVote("trip-1", "m-0", "opt-a")).resolves.toBeUndefined();
  });

  it("refuses further votes once the group has decided", async () => {
    await voteAll(["opt-a", "opt-a", "opt-a", "opt-a"]);
    await finalizeDecision("trip-1", MEMBERS);
    await expect(recordVote("trip-1", "m-0", "opt-b")).rejects.toMatchObject({
      code: "conflict",
    });
  });
});
