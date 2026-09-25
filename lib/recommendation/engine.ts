import "server-only";
import { AppError } from "@/lib/errors";
import { completeRun, createRun, failRun, listMembers, listPreferences, setTripStatus } from "@/lib/db/repo";
import { getAIProvider } from "@/lib/providers/anthropic";
import { dataSourceStatus } from "@/lib/providers";
import { buildGroupSnapshot } from "./analysis";
import { ENGINE_VERSION, PLANNING } from "./config";
import { destinationAirportName, loadActivities, loadFlights, loadTravelSummary, priorityCategories } from "./enrich";
import { evaluateMember, scoreGroup, statusFor, type MemberEvaluation } from "./scoring";
import { selectShortlist, type ScoredCandidate } from "./select";
import { estimateTravel, type ResolvedOrigin, type TravelEstimate } from "./travel";
import { generateItinerary } from "@/lib/itinerary/generate";
import { buildTransportSummary } from "@/lib/transport/build";
import { TRANSPORT_MODES, type TransportMode, type TransportSummary } from "@/types/transport";
import type { Destination } from "@/types/destination";
import type { FlightSummary } from "@/types/flight";
import type { Member } from "@/types/trip";
import type { Preference, TripStyle } from "@/types/preferences";
import type {
  EstimatedBudget,
  GroupSnapshot,
  IndividualFit,
  RecommendationOption,
} from "@/types/recommendation";

type DraftOption = Omit<RecommendationOption, "id" | "runId" | "memberCount">;

/**
 * Deterministic selection first, external data second, wording last.
 *
 * The LLM never picks destinations or produces numbers - it only rewrites an
 * explanation that has already been computed.
 */
export async function generateRecommendations(tripId: string): Promise<void> {
  const [members, preferences] = await Promise.all([listMembers(tripId), listPreferences(tripId)]);
  const submitted = preferences.filter((p) => p.submittedAt !== null);

  if (submitted.length < 2) {
    throw new AppError(
      "conflict",
      "At least two people need to answer before we can compare anything.",
    );
  }

  // Options are built from the people who have actually answered. Anyone who
  // has not is recorded on the run so the group is told they were left out,
  // rather than being silently counted as agreeing with whatever wins.
  const answeredIds = new Set(submitted.map((preference) => preference.memberId));
  const participants = members.filter((member) => answeredIds.has(member.id));
  const excluded = members.filter((member) => !answeredIds.has(member.id));

  const runId = await createRun(tripId, ENGINE_VERSION);

  try {
    await setTripStatus(tripId, "analyzing");
    const snapshot = buildGroupSnapshot(submitted, participants, excluded);
    const { options, shortfallReason } = await buildOptions(submitted, participants, snapshot);

    await completeRun({ runId, snapshot, shortfallReason, options, members: participants });
    await setTripStatus(tripId, "deciding");
  } catch (error) {
    await failRun(runId, error instanceof Error ? error.message : "Unknown failure");
    throw error;
  }
}

async function buildOptions(
  preferences: Preference[],
  members: Member[],
  snapshot: GroupSnapshot,
): Promise<{ options: DraftOption[]; shortfallReason: string | null }> {
  const shortlist = selectShortlist(preferences);
  if (shortlist.candidates.length === 0) {
    return { options: [], shortfallReason: shortlist.shortfallReason };
  }

  // Only the shortlisted destinations hit external APIs. Everything before this
  // point is arithmetic, which is what keeps a run cheap and bounded.
  const enriched = await Promise.all(
    shortlist.candidates.map((candidate) =>
      enrichCandidate(
        candidate,
        preferences,
        members,
        shortlist.origins,
        shortlist.originByMember,
        snapshot,
      ),
    ),
  );

  const options = enriched
    .sort((a, b) => b.groupScore - a.groupScore)
    .map((option, index) => ({ ...option, rank: index + 1 }));

  const shortfallReason =
    options.length < PLANNING.shortlistSize ? shortlist.shortfallReason : null;

  return { options, shortfallReason };
}

async function enrichCandidate(
  candidate: ScoredCandidate,
  preferences: Preference[],
  members: Member[],
  origins: ResolvedOrigin[],
  originByMember: Map<string, ResolvedOrigin>,
  snapshot: GroupSnapshot,
): Promise<DraftOption> {
  const { destination, window } = candidate;
  const dates = { start: window.start, end: window.end };
  const nameById = new Map(members.map((m) => [m.id, m.name]));

  const passengersByOrigin = new Map(origins.map((o) => [o.city, o.memberIds.length]));
  const categories = priorityCategories(destination, snapshot.topStyles);

  // Independent lookups: any one of them can fail without losing the option.
  // Only modes the whole group is willing to use are on the table.
  const allowedModes: TransportMode[] = TRANSPORT_MODES.filter((mode) =>
    preferences.every((preference) =>
      preference.transportModes.length === 0 ? true : preference.transportModes.includes(mode),
    ),
  );

  const [flightResult, travelResult, activityResult] = await Promise.allSettled([
    loadFlights(destination, origins, dates, passengersByOrigin),
    loadTravelSummary(destination, origins),
    loadActivities(destination, categories),
  ]);

  const flightSummary: FlightSummary | null =
    flightResult.status === "fulfilled" ? flightResult.value : null;
  const travelSummary = travelResult.status === "fulfilled" ? travelResult.value : null;
  const activities = activityResult.status === "fulfilled" ? activityResult.value.activities : [];

  if (flightResult.status === "rejected") console.warn("[engine] flights failed", flightResult.reason);
  if (travelResult.status === "rejected") console.warn("[engine] routes failed", travelResult.reason);
  if (activityResult.status === "rejected")
    console.warn("[engine] activities failed", activityResult.reason);

  let transportSummary: TransportSummary | null = null;
  try {
    transportSummary = await buildTransportSummary({
      destination,
      origins,
      flights: flightSummary,
      partySizeByCity: passengersByOrigin,
      allowedModes: allowedModes.length > 0 ? allowedModes : undefined,
    });
  } catch (error) {
    console.warn("[engine] transport options failed", error);
  }

  // Re-score with real flight prices where we have them, so what the group sees
  // and what the ranking is built from are the same numbers.
  // What each origin would actually pay and spend in travel time, using the
  // mode we recommend for them rather than assuming everybody flies.
  const chosenByCity = new Map(
    (transportSummary?.perOrigin ?? []).map((entry) => [
      entry.originCity,
      entry.options.find((option) => option.mode === entry.recommended) ?? null,
    ]),
  );

  const evaluations = preferences.map((preference) => {
    const origin = originByMember.get(preference.memberId);
    const estimate = origin ? estimateTravel(origin, destination) : null;
    const chosen = origin ? chosenByCity.get(origin.city) : null;

    const travel: TravelEstimate | null =
      estimate && chosen
        ? {
            ...estimate,
            flightCostINR: chosen.costPerPerson,
            totalHours: chosen.durationHours,
            mode: chosen.mode === "fly" ? "fly" : "drive",
          }
        : estimate;

    return evaluateMember(preference, {
      destination,
      duration: window.duration,
      window: dates,
      availability:
        window.members.find((m) => m.memberId === preference.memberId)?.availability ?? "unknown",
      travel,
    });
  });

  const { groupScore, membersSatisfied } = scoreGroup({ evaluations });

  const individualFit: IndividualFit[] = evaluations.map((evaluation) => ({
    memberId: evaluation.memberId,
    memberName: nameById.get(evaluation.memberId) ?? "Member",
    score: evaluation.score,
    status: evaluation.hardViolations.length > 0 ? "not-fit" : statusFor(evaluation.score),
    matchedPreferences: evaluation.matchedPreferences,
    conflicts: evaluation.conflicts,
  }));

  const estimatedBudget = buildBudget(
    destination,
    window.duration,
    transportSummary,
    evaluations,
  );

  const matchedStyles = destination.tags.filter((tag) =>
    snapshot.topStyles.some((entry) => entry.style === tag),
  ) as TripStyle[];

  const travelHours = (travelSummary?.perOrigin ?? [])
    .map((entry) => entry.durationMinutes)
    .filter((minutes): minutes is number => typeof minutes === "number")
    .map((minutes) => Math.round((minutes / 60) * 10) / 10);

  const explanation = await getAIProvider().explain({
    destination,
    dates,
    duration: window.duration,
    perPersonMin: estimatedBudget.perPersonMin,
    perPersonMax: estimatedBudget.perPersonMax,
    memberCount: members.length,
    membersSatisfied,
    matchedStyles,
    individualFit,
    conflicts: snapshot.conflicts,
    travelHoursRange: travelHours.length
      ? { min: Math.min(...travelHours), max: Math.max(...travelHours) }
      : null,
  });

  const itinerary = generateItinerary({
    destination,
    start: dates.start,
    duration: window.duration,
    activities,
    priorityCategories: categories,
  });

  const status = dataSourceStatus();

  return {
    rank: 1,
    destinationId: destination.id,
    destination,
    dates,
    duration: window.duration,
    estimatedBudget,
    groupScore,
    membersSatisfied,
    individualFit,
    conflicts: individualFit.flatMap((fit) => fit.conflicts).slice(0, 6),
    reasons: explanation.reasons,
    compromise: explanation.compromise,
    topStyles: matchedStyles,
    flightSummary,
    travelSummary,
    transportSummary,
    activities,
    itinerary,
    sourceTimestamps: {
      computed: new Date().toISOString(),
      ...(flightSummary ? { flights: flightSummary.checkedAt } : {}),
      flightsSource: status.flights,
      activitiesSource: status.activities,
      routesSource: status.routes,
      explanation: explanation.source,
      destinationAirport: destinationAirportName(destination) ?? "unknown",
    },
    explanationSource: explanation.source,
  };
}

function buildBudget(
  destination: Destination,
  duration: number,
  transport: TransportSummary | null,
  evaluations: MemberEvaluation[],
): EstimatedBudget {
  const onGround = destination.dailyCostINR * duration;
  const min = transport?.minCostPerPerson ?? null;
  const max = transport?.maxCostPerPerson ?? null;

  // With no flight data at all, fall back to the travel estimates already used
  // in scoring so the displayed number and the score never disagree.
  const costs = evaluations.map((e) => e.estimatedCost);
  const fallbackMin = costs.length ? Math.min(...costs) : onGround;
  const fallbackMax = costs.length ? Math.max(...costs) : onGround;

  const perPersonMin = min !== null ? onGround + min : fallbackMin;
  const perPersonMax = max !== null ? onGround + max : fallbackMax;

  return {
    perPersonMin: Math.round(perPersonMin),
    perPersonMax: Math.round(perPersonMax),
    currency: "INR",
    breakdown: [
      { label: `Stay, food and local travel (${duration} days)`, amount: onGround },
      {
        label: min !== null ? "Getting there and back, cheapest origin" : "Estimated travel",
        amount: Math.round(min !== null ? min : fallbackMin - onGround),
      },
      ...(max !== null && max !== min
        ? [{ label: "Getting there and back, furthest origin", amount: max }]
        : []),
    ],
  };
}
