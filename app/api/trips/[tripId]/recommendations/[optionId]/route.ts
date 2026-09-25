import { handle, ok } from "@/lib/api";
import { notFound } from "@/lib/errors";
import { requireMembership } from "@/lib/auth/session";
import { getOptionById } from "@/lib/db/repo";
import { dataSourceStatus } from "@/lib/providers";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ tripId: string; optionId: string }> },
) {
  return handle(async () => {
    const { tripId, optionId } = await params;
    await requireMembership(tripId);

    const option = await getOptionById(tripId, optionId);
    if (!option) throw notFound("We could not find that option.");

    return ok({ option, dataSources: dataSourceStatus() });
  });
}
