import { Check, CircleAlert, CircleMinus, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FitStatus, IndividualFit } from "@/types/recommendation";

const FIT: Record<
  FitStatus,
  { label: string; tone: "strong" | "good" | "partial" | "notfit"; icon: typeof Check }
> = {
  strong: { label: "Strong fit", tone: "strong", icon: Check },
  good: { label: "Good fit", tone: "good", icon: Check },
  partial: { label: "Partial fit", tone: "partial", icon: CircleAlert },
  "not-fit": { label: "Does not work", tone: "notfit", icon: X },
};

export function FitBadge({ status }: { status: FitStatus }) {
  const config = FIT[status];
  const Icon = config.icon;
  return (
    <Badge tone={config.tone}>
      <Icon className="h-3 w-3" aria-hidden />
      {config.label}
    </Badge>
  );
}

/**
 * The member-by-member breakdown, sorted worst first.
 *
 * The person an option suits least is shown at the top on purpose: hiding them
 * is exactly the behaviour that leaves a group stuck.
 */
export function IndividualFitList({ fits }: { fits: IndividualFit[] }) {
  const ordered = [...fits].sort((a, b) => a.score - b.score);

  return (
    <ul className="space-y-3">
      {ordered.map((fit) => (
        <li
          key={fit.memberId}
          className={cn(
            "rounded-2xl border p-4",
            fit.status === "not-fit"
              ? "border-notfit/30 bg-notfit-soft/40"
              : fit.status === "partial"
                ? "border-partial/30 bg-partial-soft/30"
                : "border-border bg-surface",
          )}
        >
          <div className="flex flex-wrap items-center gap-3">
            <Avatar name={fit.memberName} />
            <p className="flex-1 text-sm font-medium">{fit.memberName}</p>
            <FitBadge status={fit.status} />
          </div>

          {fit.matchedPreferences.length > 0 ? (
            <ul className="mt-3 space-y-1.5">
              {fit.matchedPreferences.slice(0, 3).map((entry) => (
                <li key={entry} className="flex items-start gap-2 text-sm text-ink-soft">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-strong" aria-hidden />
                  {entry}
                </li>
              ))}
            </ul>
          ) : null}

          {fit.conflicts.length > 0 ? (
            <ul className="mt-2 space-y-1.5">
              {fit.conflicts.slice(0, 3).map((entry) => (
                <li key={entry} className="flex items-start gap-2 text-sm text-ink-soft">
                  <CircleMinus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-notfit" aria-hidden />
                  {entry}
                </li>
              ))}
            </ul>
          ) : null}

          {fit.matchedPreferences.length === 0 && fit.conflicts.length === 0 ? (
            <p className="mt-2 text-sm text-ink-faint">Nothing they flagged either way.</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Compact "works well for 4/5" indicator backed by the real counts. */
export function FitSummary({
  fits,
  membersSatisfied,
  memberCount,
}: {
  fits: IndividualFit[];
  membersSatisfied: number;
  memberCount: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div aria-hidden className="flex gap-1">
        {[...fits]
          .sort((a, b) => b.score - a.score)
          .map((fit) => (
            <span
              key={fit.memberId}
              title={`${fit.memberName}: ${FIT[fit.status].label}`}
              className={cn(
                "h-2 w-6 rounded-full",
                fit.status === "strong"
                  ? "bg-strong"
                  : fit.status === "good"
                    ? "bg-good"
                    : fit.status === "partial"
                      ? "bg-partial"
                      : "bg-notfit",
              )}
            />
          ))}
      </div>
      <p className="text-sm font-medium">
        Works well for {membersSatisfied}/{memberCount}
        <span className="sr-only">
          {" "}
          members.{" "}
          {fits
            .map((fit) => `${fit.memberName}: ${FIT[fit.status].label}.`)
            .join(" ")}
        </span>
      </p>
    </div>
  );
}
