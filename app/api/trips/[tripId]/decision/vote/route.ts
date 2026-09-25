import { NextRequest } from "next/server";
import { handle, ok } from "@/lib/api";
import { requireMembership } from "@/lib/auth/session";
import { voteSchema } from "@/lib/validation/trip";
import { getDecisionState, recordVote } from "@/lib/decision/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  return handle(async () => {
    const { tripId } = await params;
    const { member, members } = await requireMembership(tripId);

    const { optionId } = voteSchema.parse(await request.json());
    await recordVote(tripId, member.id, optionId);

    return ok({ decision: await getDecisionState(tripId, members) });
  });
}
