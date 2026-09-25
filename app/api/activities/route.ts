import { z } from "zod";
import { handle, ok } from "@/lib/api";
import { notFound } from "@/lib/errors";
import { requireMembership } from "@/lib/auth/session";
import { activitiesMode, getActivityProvider } from "@/lib/providers";
import { getDestination } from "@/data/destinations";
import { TRIP_STYLES } from "@/types/preferences";

const categories = TRIP_STYLES.filter((style) => style !== "mixed");

const querySchema = z.object({
  tripId: z.string().uuid(),
  destinationId: z.string().trim().min(1).max(80),
  category: z.enum(categories as unknown as [string, ...string[]]),
  limit: z.coerce.number().int().min(1).max(8).default(4),
});

export async function GET(request: Request) {
  return handle(async () => {
    const url = new URL(request.url);
    const input = querySchema.parse(Object.fromEntries(url.searchParams));
    await requireMembership(input.tripId);

    const destination = getDestination(input.destinationId);
    if (!destination) throw notFound("We do not have that destination.");

    const activities = await getActivityProvider().searchActivities(
      destination,
      input.category as (typeof categories)[number],
      input.limit,
    );

    return ok({ activities, source: activitiesMode() });
  });
}
