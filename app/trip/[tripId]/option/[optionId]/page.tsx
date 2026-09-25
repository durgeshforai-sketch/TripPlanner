import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Vote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DestinationArt, DestinationPhotoCredit } from "@/components/trip/destinationArt";
import { OptionDetail, OptionHero } from "@/components/recommendations/optionDetail";
import { requireMembership } from "@/lib/auth/session";
import { getOptionById } from "@/lib/db/repo";

export async function generateMetadata({ params }: PageProps<"/trip/[tripId]/option/[optionId]">) {
  const { tripId, optionId } = await params;
  const membership = await requireMembership(tripId).catch(() => null);
  if (!membership) return { title: "Trip option" };
  const option = await getOptionById(tripId, optionId);
  return { title: option ? option.destination.name : "Trip option" };
}

export default async function OptionPage({ params }: PageProps<"/trip/[tripId]/option/[optionId]">) {
  const { tripId, optionId } = await params;
  await requireMembership(tripId);

  const option = await getOptionById(tripId, optionId);
  if (!option) notFound();

  return (
    <div>
      <div className="relative h-52 sm:h-72">
        <DestinationArt
          destination={option.destination}
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/35 to-black/10" />
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
        <div className="-mt-12 sm:-mt-16">
          <Link
            href={`/trip/${tripId}/results`}
            className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            All options
          </Link>

          <div className="mt-4 animate-rise">
            <OptionHero option={option} />
          </div>
        </div>

        <div className="mt-8">
          <OptionDetail option={option} />
        </div>

        <DestinationPhotoCredit destination={option.destination} className="mt-8" />

        <div className="mt-6 flex flex-col gap-3 rounded-3xl border border-border bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-soft">
            Seen enough? The group decides together — nothing is chosen for you.
          </p>
          <Button asChild>
            <Link href={`/trip/${tripId}/decision`}>
              <Vote className="h-4 w-4" aria-hidden />
              Go to the vote
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
