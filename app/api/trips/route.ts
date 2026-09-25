import { NextRequest } from "next/server";
import { handle, ok } from "@/lib/api";
import { createTripSchema } from "@/lib/validation/trip";
import { createTrip } from "@/lib/db/repo";
import { generateInviteCode, startSession } from "@/lib/auth/session";
import { savePreferenceDraftOrigin } from "@/lib/trips/service";

export async function POST(request: NextRequest) {
  return handle(async () => {
    const input = createTripSchema.parse(await request.json());

    const { trip, owner } = await createTrip({
      name: input.name,
      description: input.description ?? null,
      expectedMembers: input.expectedMembers,
      inviteCode: generateInviteCode(),
      ownerName: input.ownerName,
    });

    // The organiser is signed in immediately; no separate join step for them.
    await startSession(trip.id, owner.id, "owner");

    // Their home city is already known, so it is pre-filled on the origin step.
    await savePreferenceDraftOrigin(trip.id, {
      originCity: input.originCity,
      originPlaceId: input.originPlaceId ?? null,
      originLatitude: input.originLatitude ?? null,
      originLongitude: input.originLongitude ?? null,
    });

    return ok({ tripId: trip.id, inviteCode: trip.inviteCode });
  });
}
