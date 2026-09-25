import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Columns3, Vote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, Notice } from "@/components/ui/states";
import { DemoBadge } from "@/components/trip/dataSourceBadge";
import { GroupSnapshotCard } from "@/components/recommendations/groupSnapshot";
import { OptionCard } from "@/components/recommendations/optionCard";
import { GenerateButton } from "@/components/trip/generateButton";
import { requireMembership } from "@/lib/auth/session";
import { getLatestRun, listPreferences } from "@/lib/db/repo";
import { assessReadiness } from "@/lib/trips/readiness";
import { dataSourceStatus } from "@/lib/providers";

export const metadata = { title: "Your group's options" };

export default async function ResultsPage({ params }: PageProps<"/trip/[tripId]/results">) {
  const { tripId } = await params;
  const { trip, members, isOwner } = await requireMembership(tripId);

  const run = await getLatestRun(tripId);
  // Results are only ever read from a persisted run; nothing is computed here.
  if (!run) redirect(`/trip/${tripId}/waiting`);

  const preferences = await listPreferences(tripId);
  const readiness = assessReadiness({
    trip,
    members,
    preferences,
    runCreatedAt: run.createdAt,
  });

  const excluded = run.snapshot?.excludedMembers ?? [];
  const sources = dataSourceStatus();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="animate-rise">
        <p className="text-sm text-ink-faint">{trip.name}</p>
        <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">
          Your group&rsquo;s top trip options
        </h1>
        <p className="mt-2 text-ink-soft">
          {excluded.length > 0
            ? `Based on the preferences of the ${run.snapshot?.memberCount ?? 0} people who had answered.`
            : "Based on everyone\u2019s preferences."}
        </p>
        {sources.anyDemo ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <DemoBadge />
            <span className="text-sm text-ink-soft">
              Flights, places and travel times below are generated sample data, not live results.
            </span>
          </div>
        ) : null}
      </header>

      {excluded.length > 0 ? (
        <Notice tone="warning" className="mt-6">
          <span className="font-medium">
            These options were built without {excluded.join(", ")}.
          </span>{" "}
          {excluded.length === 1 ? "They had" : "They had"} not answered when the group went
          ahead, so nothing here reflects what {excluded.length === 1 ? "they want" : "they want"}.
          {isOwner ? " Run it again once they have." : ""}
        </Notice>
      ) : null}

      {readiness.hasStaleRun ? (
        <div className="mt-4 rounded-2xl border border-partial/30 bg-partial-soft/30 p-4">
          <p className="text-sm">
            <span className="font-medium text-partial">These options are out of date. </span>
            {readiness.membersMissingFromRun.map((m) => m.name).join(", ")} answered after they
            were built.
          </p>
          {isOwner ? (
            <div className="mt-3">
              <GenerateButton
                tripId={tripId}
                label="Run it again with everyone"
                force={!readiness.canGenerate}
                variant="secondary"
                size="md"
                icon="refresh"
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {run.snapshot ? (
        <div className="mt-8">
          <GroupSnapshotCard snapshot={run.snapshot} />
        </div>
      ) : null}

      <section className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-xl font-semibold">
            {run.options.length === 1
              ? "The one option that fits"
              : `${run.options.length} options that actually fit`}
          </h2>
          {run.options.length > 1 ? (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/trip/${tripId}/compare`}>
                <Columns3 className="h-4 w-4" aria-hidden />
                Compare side by side
              </Link>
            </Button>
          ) : null}
        </div>

        {run.shortfallReason ? (
          <Notice tone="warning" className="mt-4">
            {run.shortfallReason}
          </Notice>
        ) : null}

        {run.options.length === 0 ? (
          <EmptyState
            className="mt-6"
            title="Nothing clears everyone's hard limits yet"
            description="Usually this is one budget maximum or one date clash. Adjust a preference and generate again."
            action={
              <Button asChild variant="secondary" size="sm">
                <Link href={`/trip/${tripId}/preferences`}>Change my answers</Link>
              </Button>
            }
          />
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {run.options.map((option) => (
              <OptionCard key={option.id} option={option} tripId={tripId} rank={option.rank} />
            ))}
          </div>
        )}
      </section>

      {run.options.length > 0 ? (
        <div className="mt-10 flex flex-col items-start gap-3 rounded-3xl border border-border bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Ready to decide?</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Everyone votes, and you see exactly how the group splits.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href={`/trip/${tripId}/decision`}>
              <Vote className="h-4 w-4" aria-hidden />
              Go to the vote
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
