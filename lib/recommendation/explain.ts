import { formatRange } from "./dates";
import { formatINR } from "@/lib/utils";
import { TRIP_STYLE_LABELS } from "@/types/preferences";
import type { Destination } from "@/types/destination";
import type { DateRange, TripStyle } from "@/types/preferences";
import type { IndividualFit } from "@/types/recommendation";

export interface ExplanationInput {
  destination: Destination;
  dates: DateRange;
  duration: number;
  perPersonMin: number;
  perPersonMax: number;
  memberCount: number;
  membersSatisfied: number;
  matchedStyles: TripStyle[];
  individualFit: IndividualFit[];
  /** Group-level conflicts that this option does not resolve. */
  conflicts: string[];
  travelHoursRange: { min: number; max: number } | null;
}

export interface Explanation {
  reasons: string[];
  compromise: string | null;
  source: "ai" | "deterministic";
}

/**
 * Deterministic explanation built only from computed values. This is the
 * baseline, and the fallback whenever the AI layer is absent or returns
 * anything that does not validate.
 */
export function explainDeterministically(input: ExplanationInput): Explanation {
  const reasons: string[] = [];

  if (input.membersSatisfied === input.memberCount) {
    reasons.push(`Works for all ${input.memberCount} of you on ${formatRange(input.dates)}.`);
  } else {
    reasons.push(
      `Works well for ${input.membersSatisfied} of ${input.memberCount} on ${formatRange(input.dates)}.`,
    );
  }

  if (input.matchedStyles.length > 0) {
    const styles = input.matchedStyles
      .slice(0, 3)
      .map((style) => TRIP_STYLE_LABELS[style].toLowerCase());
    reasons.push(`Covers what most of you asked for: ${listToSentence(styles)}.`);
  }

  reasons.push(
    input.perPersonMin === input.perPersonMax
      ? `Around ${formatINR(input.perPersonMin)} per person for ${input.duration} days.`
      : `Roughly ${formatINR(input.perPersonMin)}–${formatINR(input.perPersonMax)} per person for ${input.duration} days, depending on where you fly from.`,
  );

  if (input.travelHoursRange) {
    const { min, max } = input.travelHoursRange;
    reasons.push(
      min === max
        ? `About ${min}h of travel each way.`
        : `Between ${min}h and ${max}h of travel each way across the group.`,
    );
  }

  return { reasons, compromise: buildCompromise(input), source: "deterministic" };
}

export function buildCompromise(input: ExplanationInput): string | null {
  const struggling = input.individualFit
    .filter((fit) => fit.status === "not-fit" || fit.status === "partial")
    .sort((a, b) => a.score - b.score);

  if (struggling.length === 0) {
    // Nobody is being asked to give anything up on this option. Saying so is
    // more useful than repeating a group-level tension the option resolves.
    const stretched = input.individualFit
      .filter((fit) => fit.conflicts.length > 0)
      .sort((a, b) => a.score - b.score);
    if (stretched.length === 0) return null;
    const worst = stretched[0];
    return `Nothing major. The closest thing to a compromise is for ${worst.memberName}: ${lower(worst.conflicts[0])}.`;
  }

  const worst = struggling[0];
  const reason = lower(worst.conflicts[0] ?? "this is not quite their kind of trip");

  if (struggling.length === 1) {
    return `${worst.memberName} is the one compromising here — ${reason}.`;
  }
  return `${worst.memberName} and ${struggling.length - 1} other${struggling.length > 2 ? "s" : ""} are compromising — for ${worst.memberName}, ${reason}.`;
}

function lower(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function listToSentence(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
