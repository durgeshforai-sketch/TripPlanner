import { z } from "zod";
import { handle, ok } from "@/lib/api";
import { conflict } from "@/lib/errors";
import { requireMembership, requireOwner } from "@/lib/auth/session";
import { getLatestRun, listPreferences, setTripStatus } from "@/lib/db/repo";
import { generateRecommendations } from "@/lib/recommendation/engine";
import { assessReadiness } from "@/lib/trips/readiness";
import { dataSourceStatus } from "@/lib/providers";

export const maxDuration = 60;

const bodySchema = z.object({
  /** Explicit opt-in to build options without the people still missing. */
  force: z.boolean().default(false),
});

export async function GET(_: Request, { params }: { params: Promise<{ tripId: string }> }) {
  return handle(async () => {
    const { tripId } = await params;
    const { trip, members } = await requireMembership(tripId);

    const [run, preferences] = await Promise.all([
      getLatestRun(tripId),
      listPreferences(tripId),
    ]);

    return ok({
      run,
      readiness: assessReadiness({
        trip,
        members,
        preferences,
        runCreatedAt: run?.createdAt ?? null,
      }),
      dataSources: dataSourceStatus(),
    });
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> },
) {
  return handle(async () => {
    const { tripId } = await params;
    const { trip, members } = await requireOwner(tripId);

    const raw: unknown = await request.json().catch(() => ({}));
    const { force } = bodySchema.parse(raw);

    const preferences = await listPreferences(tripId);
    const readiness = assessReadiness({ trip, members, preferences });

    // Readiness is measured against the number of people invited, not against
    // whoever has joined so far — otherwise a trip for five can lock itself in
    // as soon as the first two answer.
    if (!readiness.canGenerate && !force) {
      throw conflict(readiness.blockReason ?? "The group is not ready yet.");
    }
    if (force && !readiness.canGenerateAnyway) {
      throw conflict("At least two people need to answer before we can compare anything.");
    }

    try {
      await generateRecommendations(tripId);
    } catch (error) {
      await setTripStatus(tripId, "collecting");
      throw error;
    }

    const run = await getLatestRun(tripId);
    return ok({ run, dataSources: dataSourceStatus() });
  });
}
