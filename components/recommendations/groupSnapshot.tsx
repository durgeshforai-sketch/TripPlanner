import { CalendarRange, Coins, MapPin, TriangleAlert, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { IconChip } from "@/components/ui/iconChip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/utils";
import { formatRange } from "@/lib/recommendation/dates";
import { TRIP_STYLE_LABELS } from "@/types/preferences";
import type { GroupSnapshot } from "@/types/recommendation";

export function GroupSnapshotCard({ snapshot }: { snapshot: GroupSnapshot }) {
  const budget =
    snapshot.budget.overlapLow !== null && snapshot.budget.overlapHigh !== null
      ? `${formatINR(snapshot.budget.overlapLow)} – ${formatINR(snapshot.budget.overlapHigh)}`
      : `Up to ${formatINR(snapshot.budget.lowestMaximum)}`;

  const dates =
    snapshot.dates.overlapRanges.length > 0
      ? formatRange(snapshot.dates.overlapRanges[0])
      : "No shared window";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Where your group stands</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            tone="primary"
            icon={<Users className="h-4 w-4" aria-hidden />}
            label="Responded"
            value={`${snapshot.submittedCount}/${snapshot.memberCount}`}
          />
          <Stat
            tone="strong"
            icon={<Coins className="h-4 w-4" aria-hidden />}
            label="Budget everyone can meet"
            value={budget}
          />
          <Stat
            tone="good"
            icon={<CalendarRange className="h-4 w-4" aria-hidden />}
            label="Shared dates"
            value={dates}
          />
          <Stat
            tone="accent"
            icon={<MapPin className="h-4 w-4" aria-hidden />}
            label="Ideal trip length"
            value={
              snapshot.duration.consensus ? `${snapshot.duration.consensus} days` : "No agreement"
            }
          />
        </dl>

        {snapshot.headlines.length > 0 ? (
          <ul className="space-y-1.5">
            {snapshot.headlines.map((headline) => (
              <li key={headline} className="text-sm text-ink-soft">
                {headline}
              </li>
            ))}
          </ul>
        ) : null}

        {snapshot.topStyles.length > 0 ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
              What the group wants
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {snapshot.topStyles.map((entry) => (
                <Badge key={entry.style} tone={entry.mustCount > 0 ? "primary" : "neutral"}>
                  {TRIP_STYLE_LABELS[entry.style]} · {entry.count}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        {snapshot.origins.length > 1 ? (
          <p className="text-sm text-ink-soft">
            You would be travelling from {snapshot.origins.length} different cities:{" "}
            {snapshot.origins.map((o) => o.city).join(", ")}.
          </p>
        ) : null}

        {snapshot.conflicts.length > 0 ? (
          <div className="rounded-2xl border border-partial/30 bg-partial-soft/40 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-partial">
              <TriangleAlert className="h-4 w-4" aria-hidden />
              What is pulling against each other
            </p>
            <ul className="mt-2 space-y-1.5">
              {snapshot.conflicts.map((conflict) => (
                <li key={conflict} className="text-sm text-ink-soft">
                  {conflict}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "primary" | "strong" | "good" | "accent";
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-3.5">
      <IconChip tone={tone} size="sm">
        {icon}
      </IconChip>
      <div className="min-w-0">
        <dt className="text-xs text-ink-faint">{label}</dt>
        <dd className="mt-0.5 text-sm font-bold">{value}</dd>
      </div>
    </div>
  );
}
