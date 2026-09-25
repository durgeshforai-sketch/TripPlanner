import { DEAL_BREAKER_RULES, MUST_HAVE_TAGS, THRESHOLDS, WEIGHTS } from "./config";
import { formatRange } from "./dates";
import { formatINR } from "@/lib/utils";
import type { Destination } from "@/types/destination";
import type { Preference, TripStyle } from "@/types/preferences";
import type { FitStatus } from "@/types/recommendation";
import type { Availability } from "./dates";
import type { TravelEstimate } from "./travel";

export interface HardViolation {
  kind: "budget" | "dates" | "scope" | "duration" | "deal-breaker";
  message: string;
}

export interface MemberEvaluation {
  memberId: string;
  score: number;
  status: FitStatus;
  matchedPreferences: string[];
  conflicts: string[];
  hardViolations: HardViolation[];
  /** Per-person cost used for this evaluation, in INR. */
  estimatedCost: number;
}

export interface EvaluationContext {
  destination: Destination;
  duration: number;
  window: { start: string; end: string };
  availability: Availability;
  travel: TravelEstimate | null;
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

export function estimatedCostFor(
  destination: Destination,
  duration: number,
  travel: TravelEstimate | null,
): number {
  const onGround = destination.dailyCostINR * duration;
  return onGround + (travel?.flightCostINR ?? 0);
}

/**
 * Hard constraints are checked before any soft scoring. A violation does not
 * silently remove the option — it marks this member as not-fit and is surfaced,
 * because hiding one person's blocker is exactly the failure this product fixes.
 */
export function checkHardConstraints(
  preference: Preference,
  context: EvaluationContext,
  cost: number,
): HardViolation[] {
  const violations: HardViolation[] = [];
  const { destination, duration, availability, travel } = context;

  if (cost > preference.maximumBudget) {
    violations.push({
      kind: "budget",
      message: `Costs about ${formatINR(cost)}, above their ${formatINR(preference.maximumBudget)} maximum`,
    });
  }

  if (availability === "unavailable") {
    violations.push({
      kind: "dates",
      message: `Not available on ${formatRange(context.window)}`,
    });
  }

  if (duration > preference.maxDays) {
    violations.push({
      kind: "duration",
      message: `${duration} days is longer than the ${preference.maxDays} days they can travel`,
    });
  }

  for (const dealBreaker of preference.dealBreakers) {
    const violation = evaluateDealBreaker(dealBreaker, destination, travel);
    if (violation === "hard") {
      violations.push({ kind: "deal-breaker", message: `Conflicts with "${dealBreaker}"` });
    }
  }

  return violations;
}

/**
 * Only deal-breakers we can genuinely evaluate against our data are enforced.
 * Anything else is reported to the group as a booking note elsewhere, never
 * guessed at here.
 */
export function evaluateDealBreaker(
  dealBreaker: string,
  destination: Destination,
  travel: TravelEstimate | null,
): "hard" | "soft" | "none" {
  const key = dealBreaker.trim().toLowerCase();
  const rule = DEAL_BREAKER_RULES[key];
  const kind = rule?.kind ?? inferCustomRule(key);
  if (kind === "not-evaluable") return "none";

  const violated = matchesDealBreaker(key, destination, travel);
  if (!violated) return "none";
  return kind === "hard" ? "hard" : "soft";
}

function inferCustomRule(key: string): "hard" | "soft" | "not-evaluable" {
  if (key.includes("international") || key.includes("abroad")) return "hard";
  if (key.includes("long travel") || key.includes("long flight") || key.includes("long journey"))
    return "hard";
  if (key.includes("party") || key.includes("clubbing")) return "hard";
  if (key.includes("trek") || key.includes("hik")) return "soft";
  if (key.includes("beach")) return "soft";
  if (key.includes("cold") || key.includes("snow")) return "soft";
  return "not-evaluable";
}

function matchesDealBreaker(
  key: string,
  destination: Destination,
  travel: TravelEstimate | null,
): boolean {
  if (key.includes("international") || key.includes("abroad")) {
    return destination.scope === "international";
  }
  if (key.includes("long travel") || key.includes("long flight") || key.includes("long journey")) {
    return travel !== null && travel.totalHours > THRESHOLDS.longTravelHours;
  }
  if (key.includes("party") || key.includes("clubbing")) {
    return destination.notableFor.some((n) => n.toLowerCase().includes("nightlife"));
  }
  if (key.includes("trek") || key.includes("hik")) {
    return destination.notableFor.some((n) => n.toLowerCase().includes("trekking"));
  }
  if (key.includes("beach")) return destination.tags.includes("beach");
  if (key.includes("cold") || key.includes("snow")) {
    return destination.regions.some((r) => /himalaya|alps/i.test(r));
  }
  return false;
}

export function evaluateMember(
  preference: Preference,
  context: EvaluationContext,
): MemberEvaluation {
  const { destination, duration, availability, travel } = context;
  const cost = estimatedCostFor(destination, duration, travel);
  const hardViolations = checkHardConstraints(preference, context, cost);

  const matched: string[] = [];
  const conflicts: string[] = [];

  // ---- Budget
  const budgetFit = scoreBudget(preference, cost);
  if (budgetFit >= 0.85) matched.push(`Around ${formatINR(cost)}, inside their comfortable budget`);
  else if (budgetFit > 0)
    conflicts.push(
      `Around ${formatINR(cost)}, above their comfortable ${formatINR(preference.comfortableBudget)}`,
    );

  // ---- Dates
  const dateFit = scoreDates(availability);
  if (availability === "preferred") matched.push("These are dates they asked for");
  else if (availability === "possible") matched.push("They can make these dates");
  else if (availability === "unknown") conflicts.push("They did not mark these dates either way");

  // ---- Destination preference
  const destinationFit = scoreDestinationPreference(preference, destination);
  if (destinationFit >= 0.95) matched.push(`${destination.name} is on their own list`);
  else if (preference.destinationMode === "specific" && destinationFit < 0.5)
    conflicts.push("Not one of the places they suggested");

  if (preference.travelScope === "domestic" && destination.scope === "international") {
    conflicts.push("They were looking for a domestic trip");
  }
  if (preference.travelScope === "international" && destination.scope === "domestic") {
    conflicts.push("They were hoping to travel abroad");
  }

  // ---- Duration
  const durationFit = scoreDuration(preference, duration);
  if (durationFit >= 0.9) matched.push(`${duration} days matches their ideal trip length`);
  else if (durationFit < 0.5)
    conflicts.push(`${duration} days is off their ideal ${preference.preferredDays}`);

  // ---- Style and must-haves
  const style = scoreStyle(preference, destination);
  matched.push(...style.matched);
  conflicts.push(...style.conflicts);

  // ---- Travel time
  const travelFit = scoreTravelTime(travel);
  if (travel && travel.totalHours <= 4) {
    matched.push(`About ${travel.totalHours}h from ${preference.originCity}`);
  } else if (travel && travel.totalHours >= 10) {
    conflicts.push(`Around ${travel.totalHours}h of travel from ${preference.originCity}`);
  }

  // ---- Everything else
  const other = scoreOther(preference, destination, travel);
  conflicts.push(...other.conflicts);

  const weighted =
    budgetFit * WEIGHTS.individual.budget +
    dateFit * WEIGHTS.individual.dates +
    destinationFit * WEIGHTS.individual.destinationPreference +
    durationFit * WEIGHTS.individual.duration +
    style.fit * WEIGHTS.individual.style +
    travelFit * WEIGHTS.individual.travelTime +
    other.fit * WEIGHTS.individual.other;

  const score = Math.round(clamp01(weighted / 100) * 100);
  const status = hardViolations.length > 0 ? "not-fit" : statusFor(score);

  for (const violation of hardViolations) {
    if (!conflicts.includes(violation.message)) conflicts.unshift(violation.message);
  }

  return {
    memberId: preference.memberId,
    score,
    status,
    matchedPreferences: matched,
    conflicts,
    hardViolations,
    estimatedCost: cost,
  };
}

export function statusFor(score: number): FitStatus {
  if (score >= THRESHOLDS.fit.strong) return "strong";
  if (score >= THRESHOLDS.fit.good) return "good";
  if (score >= THRESHOLDS.fit.partial) return "partial";
  return "not-fit";
}

export function scoreBudget(preference: Preference, cost: number): number {
  const { comfortableBudget, maximumBudget, budgetFlexibility } = preference;
  if (cost <= comfortableBudget) return 1;
  if (cost > maximumBudget) return 0;

  const span = Math.max(1, maximumBudget - comfortableBudget);
  const over = (cost - comfortableBudget) / span;
  // Flexible members lose less for spending above their comfortable number.
  const floor = budgetFlexibility === "high" ? 0.6 : budgetFlexibility === "medium" ? 0.45 : 0.3;
  return clamp01(1 - over * (1 - floor));
}

export function scoreDates(availability: Availability): number {
  switch (availability) {
    case "preferred":
      return 1;
    case "possible":
      return 0.75;
    case "unknown":
      return 0.4;
    case "unavailable":
      return 0;
  }
}

export function scoreDestinationPreference(
  preference: Preference,
  destination: Destination,
): number {
  if (preference.destinationMode === "open") {
    // No stated shortlist, so this dimension is neutral-positive for everyone.
    return 0.7;
  }
  const wanted = preference.desiredDestinations.some(
    (d) =>
      d.destinationId === destination.id ||
      d.name.trim().toLowerCase() === destination.name.toLowerCase() ||
      d.name.trim().toLowerCase() === destination.city.toLowerCase(),
  );
  if (wanted) return 1;
  // They named places but not this one — not a blocker, just no pull.
  return 0.25;
}

export function scoreDuration(preference: Preference, duration: number): number {
  if (duration < preference.minDays || duration > preference.maxDays) return 0;
  const distance = Math.abs(duration - preference.preferredDays);
  const span = Math.max(
    1,
    Math.max(preference.maxDays - preference.preferredDays, preference.preferredDays - preference.minDays),
  );
  return clamp01(1 - distance / (span + 1));
}

export function scoreStyle(
  preference: Preference,
  destination: Destination,
): { fit: number; matched: string[]; conflicts: string[] } {
  const tags = new Set<TripStyle>(destination.tags);
  const matched: string[] = [];
  const conflicts: string[] = [];

  let earned = 0;
  let possible = 0;

  for (const style of preference.tripStyles) {
    if (style.priority === "dont-care") continue;
    // "Mix of everything" is satisfied by any reasonably varied destination.
    const satisfied = style.style === "mixed" ? destination.tags.length >= 3 : tags.has(style.style);
    const weight = style.priority === "must" ? 2 : 1;
    possible += weight;
    if (satisfied) {
      earned += weight;
      if (style.priority === "must") matched.push(`Covers ${label(style.style)}, a must for them`);
    } else if (style.priority === "must") {
      conflicts.push(`Light on ${label(style.style)}, which they marked a must`);
    }
  }

  for (const mustHave of preference.mustHaves) {
    const wantedTags = MUST_HAVE_TAGS[mustHave.trim().toLowerCase()];
    if (!wantedTags) continue; // Not something we can check against the catalog.
    possible += 2;
    if (wantedTags.some((tag) => tags.has(tag))) {
      earned += 2;
      matched.push(`Has ${mustHave.toLowerCase()}`);
    } else {
      conflicts.push(`Missing ${mustHave.toLowerCase()}`);
    }
  }

  return { fit: possible === 0 ? 0.6 : clamp01(earned / possible), matched, conflicts };
}

export function scoreTravelTime(travel: TravelEstimate | null): number {
  if (!travel) return 0.5;
  const { travelTimeFloorHours: floor, travelTimeCeilingHours: ceiling } = THRESHOLDS;
  if (travel.totalHours <= floor) return 1;
  if (travel.totalHours >= ceiling) return 0.15;
  return clamp01(1 - (travel.totalHours - floor) / (ceiling - floor));
}

function scoreOther(
  preference: Preference,
  destination: Destination,
  travel: TravelEstimate | null,
): { fit: number; conflicts: string[] } {
  const conflicts: string[] = [];
  let fit = preference.budgetFlexibility === "high" ? 0.9 : 0.7;

  for (const dealBreaker of preference.dealBreakers) {
    if (evaluateDealBreaker(dealBreaker, destination, travel) === "soft") {
      conflicts.push(`Some tension with "${dealBreaker}"`);
      fit -= 0.35;
    }
  }

  return { fit: clamp01(fit), conflicts };
}

function label(style: TripStyle): string {
  return style === "mixed" ? "a mix of things" : style;
}

export interface GroupScoreInput {
  evaluations: MemberEvaluation[];
}

/**
 * The group score deliberately weights the worst-off member. An option that is
 * perfect for four people and impossible for one should not beat an option that
 * works for everyone.
 */
export function scoreGroup({ evaluations }: GroupScoreInput): {
  groupScore: number;
  membersSatisfied: number;
  consensus: number;
} {
  if (evaluations.length === 0) {
    return { groupScore: 0, membersSatisfied: 0, consensus: 0 };
  }

  const scores = evaluations.map((e) => e.score);
  const average = scores.reduce((a, b) => a + b, 0) / scores.length;
  const lowest = Math.min(...scores);
  const satisfiedShare =
    evaluations.filter((e) => e.hardViolations.length === 0).length / evaluations.length;

  const variance =
    scores.reduce((sum, score) => sum + (score - average) ** 2, 0) / scores.length;
  // Standard deviation of 30+ points means the group is pulling in different
  // directions; 0 means everyone feels the same way about this option.
  const consensus = clamp01(1 - Math.sqrt(variance) / 30);

  const groupScore =
    average * WEIGHTS.group.average +
    lowest * WEIGHTS.group.lowest +
    satisfiedShare * 100 * WEIGHTS.group.hardConstraintsSatisfied +
    consensus * 100 * WEIGHTS.group.consensus;

  return {
    groupScore: Math.round(groupScore * 10) / 10,
    membersSatisfied: evaluations.filter(
      (e) => e.hardViolations.length === 0 && e.score >= THRESHOLDS.satisfied,
    ).length,
    consensus,
  };
}
