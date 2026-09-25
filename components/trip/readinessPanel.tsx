import Link from "next/link";
import { Clock3, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/states";
import { CopyReminderButton } from "@/components/trip/inviteActions";
import { GenerateButton } from "@/components/trip/generateButton";
import type { TripReadiness } from "@/lib/trips/readiness";

/**
 * What the group can do next, given who has answered. Going ahead without
 * someone is always an explicit choice with its consequence spelled out.
 */
export function ReadinessPanel({
  tripId,
  readiness,
  isOwner,
  ownerName,
  inviteUrl,
}: {
  tripId: string;
  readiness: TripReadiness;
  isOwner: boolean;
  ownerName: string;
  inviteUrl: string;
}) {
  if (readiness.canGenerate) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink-soft">
          {isOwner
            ? "Everyone is in. We can work out what actually fits the group."
            : `Everyone has answered. Waiting for ${ownerName} to generate the options.`}
        </p>
        {isOwner ? <GenerateButton tripId={tripId} /> : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="flex items-start gap-2 text-sm text-ink-soft">
        <Clock3 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        {readiness.blockReason}
      </p>

      <div className="flex flex-wrap gap-2">
        <CopyReminderButton url={inviteUrl} label="Copy reminder link" />
        <Button asChild variant="ghost" size="sm">
          <Link href={`/trip/${tripId}/preferences`}>Change my answers</Link>
        </Button>
      </div>

      {isOwner && readiness.canGenerateAnyway ? (
        <div className="rounded-2xl border border-partial/30 bg-partial-soft/30 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-partial">
            <TriangleAlert className="h-4 w-4" aria-hidden />
            Not everyone has answered
          </p>
          <p className="mt-1.5 text-sm text-ink-soft">
            You can go ahead with the {readiness.submitted} who have. The options will be built
            without the others, and they will be named on the results so nobody is quietly left
            out. They can still answer afterwards, and you can run it again.
          </p>
          <div className="mt-3">
            <GenerateButton
              tripId={tripId}
              label={`Find options with the ${readiness.submitted} who answered`}
              force
              variant="secondary"
              size="md"
            />
          </div>
        </div>
      ) : null}

      {isOwner && !readiness.canGenerateAnyway ? (
        <Notice>At least two people need to answer before there is anything to compare.</Notice>
      ) : null}
    </div>
  );
}
