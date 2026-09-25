import Link from "next/link";
import { ArrowRight, CircleCheck, RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Notice } from "@/components/ui/states";
import { CopyReminderButton } from "@/components/trip/inviteActions";
import { GenerateButton } from "@/components/trip/generateButton";
import { MemberList } from "@/components/trip/memberList";
import { CoverPhoto } from "@/components/memories/coverPhoto";
import { MemoryWall } from "@/components/memories/memoryWall";
import { ReadinessPanel } from "@/components/trip/readinessPanel";
import { requireMembership } from "@/lib/auth/session";
import { getLatestRun, listPreferences } from "@/lib/db/repo";
import { assessReadiness } from "@/lib/trips/readiness";
import { siteUrl } from "@/lib/env";
import { loadMemoryWall, signedUrlFor } from "@/lib/memories/service";
import { GROUP } from "@/lib/group";
import type { TripStatus } from "@/types/trip";

export const metadata = { title: "Trip notebook" };

const STATUS_STAMP: Record<TripStatus, { label: string; tone: string }> = {
  collecting: { label: "Collecting answers", tone: "text-partial" },
  analyzing: { label: "Working it out", tone: "text-good" },
  deciding: { label: "Voting open", tone: "text-primary" },
  confirmed: { label: "It's decided!", tone: "text-strong" },
};

export default async function TripDashboard({ params }: PageProps<"/trip/[tripId]">) {
  const { tripId } = await params;
  const membership = await requireMembership(tripId);
  const { trip, member, members, isOwner } = membership;

  const [preferences, run, wall, coverUrl] = await Promise.all([
    listPreferences(tripId),
    getLatestRun(tripId),
    loadMemoryWall(membership),
    signedUrlFor(trip.coverPhotoPath),
  ]);
  const readiness = assessReadiness({
    trip,
    members,
    preferences,
    runCreatedAt: run?.createdAt ?? null,
  });

  const submittedIds = new Set(
    preferences.filter((p) => p.submittedAt !== null).map((p) => p.memberId),
  );
  const rows = members.map((m) => ({ ...m, hasSubmitted: submittedIds.has(m.id) }));
  const iHaveSubmitted = submittedIds.has(member.id);
  const inviteUrl = `${siteUrl()}/join/${trip.inviteCode}`;
  const ownerName = members.find((m) => m.role === "owner")?.name ?? "the organiser";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="grid items-center gap-12 lg:grid-cols-[1fr_minmax(0,28rem)]">
        <div className="animate-rise">
          <p className="font-hand text-2xl text-ink-faint">our trip notebook</p>
          <h1 className="mt-1 text-4xl leading-tight sm:text-6xl">{trip.name}</h1>
          {trip.description ? (
            <p className="mt-4 max-w-xl text-lg text-ink-soft">{trip.description}</p>
          ) : null}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <span className={`stamp ${STATUS_STAMP[trip.status].tone}`}>
              {STATUS_STAMP[trip.status].label}
            </span>
            <span className="font-hand text-xl text-ink-soft">
              {members.map((m) => m.name).join(" · ")}
            </span>
          </div>
        </div>
        <div className="mx-auto w-full max-w-md">
          <CoverPhoto
            tripId={tripId}
            url={coverUrl}
            fallback={GROUP.cover}
            caption={coverUrl ? trip.name : "swap in a real one of us ↓"}
          />
        </div>
      </header>

      <div className="mt-14 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>
                {readiness.submitted}/{readiness.expected} preferences submitted
              </CardTitle>
              {readiness.awaitingJoiners > 0 ? (
                <p className="mt-1 text-sm text-ink-faint">
                  {readiness.awaitingJoiners}{" "}
                  {readiness.awaitingJoiners === 1 ? "person has" : "people have"} not joined yet
                </p>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress
                value={readiness.submitted}
                max={readiness.expected}
                label={`${readiness.submitted} of ${readiness.expected} preferences submitted`}
              />

              {!iHaveSubmitted ? (
                <div className="space-y-3">
                  <p className="text-sm text-ink-soft">
                    You have not added your own preferences yet. It takes about three minutes.
                  </p>
                  <Button asChild size="lg">
                    <Link href={`/trip/${tripId}/preferences`}>
                      Add my preferences
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </Button>
                </div>
              ) : run ? (
                <div className="space-y-3">
                  <Notice tone="info">
                    <CircleCheck className="mr-1.5 inline h-4 w-4 align-text-bottom" aria-hidden />
                    Your group&rsquo;s options are ready.
                  </Notice>
                  <Button asChild size="lg">
                    <Link href={`/trip/${tripId}/results`}>
                      See your top options
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </Button>

                  {readiness.hasStaleRun ? (
                    <div className="rounded-2xl border border-partial/30 bg-partial-soft/30 p-4">
                      <p className="flex items-center gap-2 text-sm font-medium text-partial">
                        <RefreshCw className="h-4 w-4" aria-hidden />
                        These options are out of date
                      </p>
                      <p className="mt-1.5 text-sm text-ink-soft">
                        {readiness.membersMissingFromRun.map((m) => m.name).join(", ")}{" "}
                        {readiness.membersMissingFromRun.length === 1 ? "answered" : "answered"}{" "}
                        after they were built, so their preferences are not reflected.
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
                      ) : (
                        <p className="mt-2 text-sm text-ink-faint">
                          {ownerName} can run it again to include them.
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : (
                <ReadinessPanel
                  tripId={tripId}
                  readiness={readiness}
                  isOwner={isOwner}
                  ownerName={ownerName}
                  inviteUrl={inviteUrl}
                />
              )}
            </CardContent>
          </Card>

          {!run && readiness.canGenerate ? (
            <Notice>
              Once the options are generated your answers are locked, so everyone is comparing the
              same thing. Change yours before then if you need to.
            </Notice>
          ) : null}
        </div>

        <section>
          <h2 className="flex items-center gap-2 text-2xl">
            <Users className="h-5 w-5 text-primary" aria-hidden />
            The crew
          </h2>
          <div className="mt-3">
            <MemberList
              members={rows}
              meId={member.id}
              expected={readiness.expected}
              showPending={readiness.awaitingJoiners > 0}
            />
          </div>
          <div className="mt-3">
            <CopyReminderButton url={inviteUrl} label="Copy invite link" />
          </div>
        </section>
      </div>

      <div className="mt-20 border-t border-dashed border-border-strong pt-14">
        <MemoryWall tripId={tripId} meId={member.id} isOwner={isOwner} wall={wall} />
      </div>
    </div>
  );
}
