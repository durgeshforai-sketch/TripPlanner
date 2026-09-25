import Link from "next/link";
import { redirect } from "next/navigation";
import { format, parseISO } from "date-fns";
import { CalendarDays, Camera, Users, Wallet } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DestinationArt } from "@/components/trip/destinationArt";
import { SharePlanButton } from "@/components/trip/sharePlan";
import { PhotoStrip } from "@/components/journal/photoStrip";
import { GROUP, SCRAPBOOK } from "@/lib/group";
import { DestinationPhotoCredit } from "@/components/trip/destinationArt";
import { requireMembership } from "@/lib/auth/session";
import { getLatestRun } from "@/lib/db/repo";
import { getDecisionState } from "@/lib/decision/service";
import { siteUrl } from "@/lib/env";
import { formatINR } from "@/lib/utils";
import { PRODUCT } from "@/lib/config";

export const metadata = { title: "Trip confirmed" };

export default async function ConfirmedPage({ params }: PageProps<"/trip/[tripId]/confirmed">) {
  const { tripId } = await params;
  const { trip, members } = await requireMembership(tripId);

  const [run, decision] = await Promise.all([
    getLatestRun(tripId),
    getDecisionState(tripId, members),
  ]);

  const chosen = run?.options.find((option) => option.id === decision.selectedOptionId);
  if (!run || !chosen) redirect(`/trip/${tripId}/decision`);

  const budget =
    chosen.estimatedBudget.perPersonMin === chosen.estimatedBudget.perPersonMax
      ? formatINR(chosen.estimatedBudget.perPersonMin)
      : `${formatINR(chosen.estimatedBudget.perPersonMin)} – ${formatINR(chosen.estimatedBudget.perPersonMax)}`;

  const dates = `${format(parseISO(chosen.dates.start), "d MMM")} – ${format(parseISO(chosen.dates.end), "d MMM yyyy")}`;
  const summary = `${trip.name}: ${chosen.destination.name}, ${dates} (${chosen.duration} days), around ${budget} each.`;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="animate-rise text-center">
        <PhotoStrip
          className="mb-6"
          photos={[SCRAPBOOK[0], GROUP.cover, SCRAPBOOK[1]]}
          captions={["", "we're going!", ""]}
        />
        <h1 className="mt-2 text-4xl sm:text-6xl">
          We&rsquo;re <span className="italic text-primary">going.</span>
        </h1>
        <p className="mt-3 font-hand text-2xl text-ink-soft">
          Decided together. Now somebody book it.
        </p>
      </div>

      <article className="card mt-10 overflow-hidden">
        <div className="relative h-40 sm:h-52">
          <DestinationArt destination={chosen.destination} />
        </div>
        <div className="p-6 sm:p-8">
          <h2 className="text-2xl font-semibold sm:text-3xl">{chosen.destination.name}</h2>
          <p className="mt-1 text-ink-soft">
            {chosen.destination.city}, {chosen.destination.country}
          </p>

          <dl className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-surface-muted/50 p-4">
              <dt className="flex items-center gap-1.5 text-xs text-ink-faint">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                Dates
              </dt>
              <dd className="mt-1 font-semibold">{dates}</dd>
              <dd className="text-sm text-ink-faint">{chosen.duration} days</dd>
            </div>
            <div className="rounded-2xl border border-border bg-surface-muted/50 p-4">
              <dt className="flex items-center gap-1.5 text-xs text-ink-faint">
                <Wallet className="h-3.5 w-3.5" aria-hidden />
                Estimated per person
              </dt>
              <dd className="mt-1 font-semibold">{budget}</dd>
              <dd className="text-sm text-ink-faint">Planning estimate</dd>
            </div>
            <div className="rounded-2xl border border-border bg-surface-muted/50 p-4">
              <dt className="flex items-center gap-1.5 text-xs text-ink-faint">
                <Users className="h-3.5 w-3.5" aria-hidden />
                Going
              </dt>
              <dd className="mt-1 font-semibold">{members.length} of you</dd>
              <dd className="text-sm text-ink-faint">
                {decision.tally[0]?.count ?? 0} voted for this
              </dd>
            </div>
          </dl>

          {chosen.itinerary.length > 0 ? (
            <section className="mt-7">
              <h3 className="text-sm font-medium uppercase tracking-wider text-ink-faint">
                The shape of the trip
              </h3>
              <ol className="mt-3 space-y-2">
                {chosen.itinerary.map((day) => (
                  <li key={day.day} className="flex gap-3 text-sm">
                    <span className="w-14 shrink-0 font-medium text-ink-faint">Day {day.day}</span>
                    <span className="text-ink-soft">
                      {day.items.map((item) => item.title).join(" · ")}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <section className="mt-7">
            <h3 className="text-sm font-medium uppercase tracking-wider text-ink-faint">
              Who is coming
            </h3>
            <ul className="mt-3 flex flex-wrap gap-3">
              {members.map((member) => (
                <li key={member.id} className="flex items-center gap-2">
                  <Avatar name={member.name} className="h-8 w-8" />
                  <span className="text-sm">{member.name}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </article>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild size="lg">
          <Link href={`/trip/${tripId}/option/${chosen.id}`}>View full plan</Link>
        </Button>
        <SharePlanButton summary={summary} url={`${siteUrl()}/trip/${tripId}/confirmed`} />
      </div>

      <DestinationPhotoCredit destination={chosen.destination} className="mt-6 text-center" />

      <Link
        href={`/trip/${tripId}#memories`}
        className="card card-interactive mt-12 flex items-center gap-5 p-6"
      >
        <Camera className="h-8 w-8 shrink-0 text-accent" aria-hidden />
        <span>
          <span className="block font-serif text-xl font-semibold">
            When we&rsquo;re back, pin the photos
          </span>
          <span className="mt-1 block text-sm text-ink-soft">
            The memory wall keeps them in one place for all of us — not scattered across{" "}
            {members.length} camera rolls.
          </span>
        </span>
      </Link>

      <p className="mt-8 text-center text-lg font-semibold">{PRODUCT.closingLine}</p>
      <p className="mt-2 text-center text-sm text-ink-faint">
        Nothing here is booked. Take this to your booking sites and lock it in.
      </p>
    </div>
  );
}
