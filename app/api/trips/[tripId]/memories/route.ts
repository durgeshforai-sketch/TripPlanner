import { handle, ok } from "@/lib/api";
import { requireMembership } from "@/lib/auth/session";
import { addMemory, loadMemoryWall } from "@/lib/memories/service";

type Context = { params: Promise<{ tripId: string }> };

export async function GET(_: Request, { params }: Context) {
  return handle(async () => {
    const { tripId } = await params;
    const membership = await requireMembership(tripId);
    return ok(await loadMemoryWall(membership));
  });
}

/** Multipart: `file` (required), `caption`, `width`, `height`. */
export async function POST(request: Request, { params }: Context) {
  return handle(async () => {
    const { tripId } = await params;
    const membership = await requireMembership(tripId);
    const form = await request.formData();
    return ok({ memory: await addMemory(membership, form) }, { status: 201 });
  });
}
