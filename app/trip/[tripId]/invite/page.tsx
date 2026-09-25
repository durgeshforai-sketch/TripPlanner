import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { InviteActions } from "@/components/trip/inviteActions";
import { CelebrationScene } from "@/components/illustrations/scenes";
import { MemberList } from "@/components/trip/memberList";
import { requireMembership } from "@/lib/auth/session";
import { listPreferences } from "@/lib/db/repo";
import { siteUrl } from "@/lib/env";

export const metadata = { title: "Invite your group" };

export default async function InvitePage({ params }: PageProps<"/trip/[tripId]/invite">) {
  const { tripId } = await params;
  const { trip, member, members } = await requireMembership(tripId);
  const preferences = await listPreferences(tripId);
  const submitted = new Set(
    preferences.filter((p) => p.submittedAt !== null).map((p) => p.memberId),
  );

  const inviteUrl = `${siteUrl()}/join/${trip.inviteCode}`;
  const rows = members.map((m) => ({ ...m, hasSubmitted: submitted.has(m.id) }));

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="animate-rise">
        <div className="mx-auto mb-2 h-28 w-full max-w-sm">
          <CelebrationScene />
        </div>
        <h1 className="text-3xl sm:text-4xl">Your trip is ready.</h1>
        <p className="mt-3 text-ink-soft">
          Send this link to everyone coming on {trip.name}. They add what they want, and you all
          get options that fit.
        </p>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>{trip.name}</CardTitle>
          {trip.description ? (
            <p className="mt-1 text-sm text-ink-soft">{trip.description}</p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">
                {members.length}/{trip.expectedMembers} members joined
              </span>
              <span className="text-ink-faint">
                {Math.max(0, trip.expectedMembers - members.length)} to go
              </span>
            </div>
            <Progress
              className="mt-2"
              value={members.length}
              max={trip.expectedMembers}
              label={`${members.length} of ${trip.expectedMembers} members joined`}
            />
          </div>

          <div className="rounded-2xl border border-border bg-surface-muted/60 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
              Invite link
            </p>
            <p className="mt-1 break-all font-mono text-sm">{inviteUrl}</p>
          </div>

          <InviteActions url={inviteUrl} tripName={trip.name} />
        </CardContent>
      </Card>

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wider text-ink-faint">
          Who is in so far
        </h2>
        <div className="mt-3">
          <MemberList members={rows} meId={member.id} expected={trip.expectedMembers} />
        </div>
      </section>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href={`/trip/${tripId}/preferences`}>
            Add your own preferences
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href={`/trip/${tripId}`}>Go to trip dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
