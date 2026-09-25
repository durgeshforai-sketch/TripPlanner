import { handle, ok } from "@/lib/api";
import { requireMembership } from "@/lib/auth/session";
import { listPreferences } from "@/lib/db/repo";

export async function GET(_: Request, { params }: { params: Promise<{ tripId: string }> }) {
  return handle(async () => {
    const { tripId } = await params;
    const { members } = await requireMembership(tripId);
    const preferences = await listPreferences(tripId);
    const submittedIds = new Set(
      preferences.filter((p) => p.submittedAt !== null).map((p) => p.memberId),
    );

    return ok({
      members: members.map((member) => ({
        ...member,
        hasSubmitted: submittedIds.has(member.id),
      })),
    });
  });
}
