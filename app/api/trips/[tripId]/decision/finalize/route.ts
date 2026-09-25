import { handle, ok } from "@/lib/api";
import { requireMembership } from "@/lib/auth/session";
import { setTripStatus } from "@/lib/db/repo";
import { finalizeDecision, getDecisionState } from "@/lib/decision/service";

/**
 * Any member can close the vote once everyone has voted — this is a group
 * decision, not something only the organiser is allowed to confirm.
 */
export async function POST(_: Request, { params }: { params: Promise<{ tripId: string }> }) {
  return handle(async () => {
    const { tripId } = await params;
    const { members } = await requireMembership(tripId);

    const result = await finalizeDecision(tripId, members);
    if (result.outcome === "decided") await setTripStatus(tripId, "confirmed");

    return ok({ result, decision: await getDecisionState(tripId, members) });
  });
}
