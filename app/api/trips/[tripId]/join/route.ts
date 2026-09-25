import { NextRequest } from "next/server";
import { handle, ok } from "@/lib/api";
import { badRequest, conflict, notFound } from "@/lib/errors";
import { joinTripSchema } from "@/lib/validation/trip";
import { addMember, getTrip, listMembers } from "@/lib/db/repo";
import { getMembership, startSession } from "@/lib/auth/session";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  return handle(async () => {
    const { tripId } = await params;
    const input = joinTripSchema.parse(await request.json());

    const trip = await getTrip(tripId);
    if (!trip) throw notFound("That trip does not exist.");
    // The invite code is the only thing that grants entry, so it is re-checked
    // here rather than trusted from the page that rendered the form.
    if (trip.inviteCode !== input.inviteCode) throw badRequest("That invite link is not valid.");

    const existing = await getMembership(tripId);
    if (existing) return ok({ tripId, memberId: existing.member.id, alreadyJoined: true });

    const members = await listMembers(tripId);
    if (members.length >= trip.expectedMembers + 5) {
      throw conflict("This trip already has everyone it was expecting.");
    }
    if (members.some((m) => m.name.toLowerCase() === input.name.trim().toLowerCase())) {
      throw conflict("Someone in this trip is already using that name. Try adding a surname.");
    }

    const member = await addMember(tripId, input.name);
    await startSession(tripId, member.id, "participant");

    return ok({ tripId, memberId: member.id, alreadyJoined: false });
  });
}
