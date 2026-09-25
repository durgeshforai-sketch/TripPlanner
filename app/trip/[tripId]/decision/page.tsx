import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DecisionPanel } from "@/components/recommendations/decisionPanel";
import { requireMembership } from "@/lib/auth/session";
import { getLatestRun } from "@/lib/db/repo";
import { getDecisionState } from "@/lib/decision/service";

export const metadata = { title: "Make the decision" };

export default async function DecisionPage({ params }: PageProps<"/trip/[tripId]/decision">) {
  const { tripId } = await params;
  const { trip, member, members } = await requireMembership(tripId);

  const run = await getLatestRun(tripId);
  if (!run || run.options.length === 0) redirect(`/trip/${tripId}/results`);

  const decision = await getDecisionState(tripId, members);
  if (decision.status === "final" && trip.status === "confirmed") {
    redirect(`/trip/${tripId}/confirmed`);
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href={`/trip/${tripId}/results`}
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to options
      </Link>

      <header className="mt-4 animate-rise">
        <h1 className="text-3xl font-semibold sm:text-4xl">Ready to decide?</h1>
        <p className="mt-2 text-ink-soft">
          Everyone picks one. You will see the split before anything is locked in — the group
          decides, not the app.
        </p>
      </header>

      <div className="mt-8">
        <DecisionPanel
          tripId={tripId}
          options={run.options}
          meId={member.id}
          initial={decision}
        />
      </div>
    </div>
  );
}
