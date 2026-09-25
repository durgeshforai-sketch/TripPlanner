import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MemberList } from "@/components/trip/memberList";
import { SearchingScene } from "@/components/illustrations/scenes";
import { ReadinessPanel } from "@/components/trip/readinessPanel";
import { requireMembership } from "@/lib/auth/session";
import { getLatestRun, listPreferences } from "@/lib/db/repo";
import { assessReadiness } from "@/lib/trips/readiness";
import { siteUrl } from "@/lib/env";

export const metadata = { title: "Waiting for the group" };

export default async function WaitingPage({ params }: PageProps<"/trip/[tripId]/waiting">) {
  const { tripId } = await params;
  const { trip, member, members, isOwner } = await requireMembership(tripId);

  const run = await getLatestRun(tripId);
  if (run) redirect(`/trip/${tripId}/results`);

  const preferences = await listPreferences(tripId);
  const readiness = assessReadiness({ trip, members, preferences });

  const submittedIds = new Set(
    preferences.filter((p) => p.submittedAt !== null).map((p) => p.memberId),
  );
  const rows = members.map((m) => ({ ...m, hasSubmitted: submittedIds.has(m.id) }));
  const inviteUrl = `${siteUrl()}/join/${trip.inviteCode}`;
  const ownerName = members.find((m) => m.role === "owner")?.name ?? "the organiser";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
      <div className="animate-rise text-center">
        <div className="mx-auto h-32 w-full max-w-xs">
          <SearchingScene />
        </div>
        <span className="mx-auto mt-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-strong-soft text-strong">
          <CheckCircle2 className="h-5.5 w-5.5" aria-hidden />
        </span>
        <h1 className="mt-4 text-3xl">That&rsquo;s your part done.</h1>
        <p className="mt-3 text-ink-soft">
          {readiness.canGenerate
            ? "Everyone has answered. Time to see what works."
            : "We will put the options together once everyone has answered."}
        </p>
      </div>

      <div className="mt-8 rounded-3xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium">
            {readiness.submitted} of {readiness.expected} submitted
          </span>
          {readiness.awaitingJoiners > 0 ? (
            <span className="text-ink-faint">
              {readiness.awaitingJoiners} not joined yet
            </span>
          ) : null}
        </div>
        <Progress
          className="mt-3"
          value={readiness.submitted}
          max={readiness.expected}
          label={`${readiness.submitted} of ${readiness.expected} submitted`}
        />
        <div className="mt-5">
          <MemberList
            members={rows}
            meId={member.id}
            expected={readiness.expected}
            showPending={readiness.awaitingJoiners > 0}
          />
        </div>
      </div>

      <div className="mt-8">
        <ReadinessPanel
          tripId={tripId}
          readiness={readiness}
          isOwner={isOwner}
          ownerName={ownerName}
          inviteUrl={inviteUrl}
        />
      </div>

      <div className="mt-8 text-center">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/trip/${tripId}`}>Back to trip</Link>
        </Button>
      </div>
    </div>
  );
}
