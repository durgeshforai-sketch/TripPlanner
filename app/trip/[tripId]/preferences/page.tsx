import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Notice } from "@/components/ui/states";
import { PreferenceFlow } from "@/components/preferences/preferenceFlow";
import { requireMembership } from "@/lib/auth/session";
import { getLatestRun, getPreference } from "@/lib/db/repo";
import { readOriginDraft } from "@/lib/trips/service";

export const metadata = { title: "Your preferences" };

export default async function PreferencesPage({ params }: PageProps<"/trip/[tripId]/preferences">) {
  const { tripId } = await params;
  const { trip, member } = await requireMembership(tripId);

  const [existing, run] = await Promise.all([
    getPreference(tripId, member.id),
    getLatestRun(tripId),
  ]);

  const hasSubmitted = existing?.submittedAt != null;

  // Only someone who has already had their say is sent on to the results. A
  // member who has not answered must always be able to answer, even if the
  // group generated options before they joined.
  if (hasSubmitted && (trip.status === "deciding" || trip.status === "confirmed")) {
    redirect(`/trip/${tripId}/results`);
  }

  const originDraft = await readOriginDraft(tripId);
  const joinedLate = !hasSubmitted && run !== null;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href={`/trip/${tripId}`}
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {trip.name}
      </Link>

      {joinedLate ? (
        <Notice tone="warning" className="mt-6">
          Your group already worked out some options before you joined, so these were built
          without your answers. Add them now and the organiser can run it again with you
          included.
        </Notice>
      ) : null}

      <div className="mt-6">
        <PreferenceFlow
          tripId={tripId}
          existing={existing}
          alreadySubmitted={hasSubmitted}
          joinedLate={joinedLate}
          originDefault={
            existing
              ? {}
              : {
                  originCity: originDraft?.originCity ?? "",
                  originPlaceId: originDraft?.originPlaceId ?? null,
                  originLatitude: originDraft?.originLatitude ?? null,
                  originLongitude: originDraft?.originLongitude ?? null,
                }
          }
        />
      </div>
    </div>
  );
}
