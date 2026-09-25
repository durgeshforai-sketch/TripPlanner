import { handle, ok } from "@/lib/api";
import { requireMembership } from "@/lib/auth/session";
import { getDecisionState } from "@/lib/decision/service";

export async function GET(_: Request, { params }: { params: Promise<{ tripId: string }> }) {
  return handle(async () => {
    const { tripId } = await params;
    const { members } = await requireMembership(tripId);
    return ok({ decision: await getDecisionState(tripId, members) });
  });
}
