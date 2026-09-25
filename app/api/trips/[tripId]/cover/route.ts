import { handle, ok } from "@/lib/api";
import { requireMembership } from "@/lib/auth/session";
import { clearCoverPhoto, replaceCoverPhoto } from "@/lib/memories/service";

type Context = { params: Promise<{ tripId: string }> };

/** Anyone on the trip can change the group photo — it is their trip too. */
export async function PUT(request: Request, { params }: Context) {
  return handle(async () => {
    const { tripId } = await params;
    const membership = await requireMembership(tripId);
    const url = await replaceCoverPhoto(membership, await request.formData());
    return ok({ url });
  });
}

export async function DELETE(_: Request, { params }: Context) {
  return handle(async () => {
    const { tripId } = await params;
    const membership = await requireMembership(tripId);
    await clearCoverPhoto(membership);
    return ok({ cleared: true });
  });
}
