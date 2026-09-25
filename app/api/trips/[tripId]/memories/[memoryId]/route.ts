import { z } from "zod";
import { handle, ok } from "@/lib/api";
import { requireMembership } from "@/lib/auth/session";
import { removeMemory } from "@/lib/memories/service";

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ tripId: string; memoryId: string }> },
) {
  return handle(async () => {
    const { tripId, memoryId } = await params;
    const membership = await requireMembership(tripId);
    await removeMemory(membership, z.string().uuid().parse(memoryId));
    return ok({ removed: true });
  });
}
