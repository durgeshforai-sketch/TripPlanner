import { handle, ok } from "@/lib/api";
import { requireMembership } from "@/lib/auth/session";
import { listPreferences } from "@/lib/db/repo";

export async function GET(_: Request, { params }: { params: Promise<{ tripId: string }> }) {
  return handle(async () => {
    const { tripId } = await params;
    const { trip, member, members } = await requireMembership(tripId);
    const preferences = await listPreferences(tripId);
    const submitted = preferences.filter((p) => p.submittedAt !== null);

    return ok({
      trip,
      members,
      me: member,
      submittedCount: submitted.length,
      allSubmitted: members.length > 0 && submitted.length === members.length,
    });
  });
}
