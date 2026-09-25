import "server-only";
import { db } from "./supabase";
import { AppError, conflict, notFound } from "@/lib/errors";
import {
  jsonArray,
  jsonObject,
  jsonOrNull,
  toMember,
  toPreference,
  toTrip,
  type DecisionRow,
  type OptionRow,
  type VoteRow,
} from "./rows";
import type { Member, Trip } from "@/types/trip";
import type { Preference, PreferenceInput, DateRange, TripStyle } from "@/types/preferences";
import type { Json } from "@/types/database";
import { getDestination } from "@/data/destinations";
import type { Destination } from "@/types/destination";
import type { Activity } from "@/types/activity";
import type { FlightSummary } from "@/types/flight";
import type { TransportSummary } from "@/types/transport";
import type {
  EstimatedBudget,
  GroupSnapshot,
  IndividualFit,
  ItineraryDay,
  RecommendationOption,
  RecommendationRun,
  TravelSummary,
} from "@/types/recommendation";

function wrap(context: string, error: { message: string; code?: string } | null): void {
  if (!error) return;
  throw new AppError("internal", `Could not ${context}.`, {
    dbCode: error.code,
    dbMessage: error.message,
  });
}

/** jsonb writes need the `Json` shape; our domain objects are structurally Json. */
function asJson(value: unknown): Json {
  return value as Json;
}

// ---------------------------------------------------------------- trips

export async function createTrip(input: {
  name: string;
  description: string | null;
  expectedMembers: number;
  inviteCode: string;
  ownerName: string;
}): Promise<{ trip: Trip; owner: Member }> {
  const client = db();
  const { data: tripRow, error: tripError } = await client
    .from("trips")
    .insert({
      name: input.name,
      description: input.description,
      expected_members: input.expectedMembers,
      invite_code: input.inviteCode,
    })
    .select("*")
    .single();
  wrap("create the trip", tripError);
  if (!tripRow) throw new AppError("internal", "Could not create the trip.");

  const { data: memberRow, error: memberError } = await client
    .from("members")
    .insert({ trip_id: tripRow.id, name: input.ownerName, role: "owner", status: "joined" })
    .select("*")
    .single();
  if (memberError || !memberRow) {
    await client.from("trips").delete().eq("id", tripRow.id);
    wrap("create the trip owner", memberError);
    throw new AppError("internal", "Could not create the trip owner.");
  }

  const { data: updated, error: updateError } = await client
    .from("trips")
    .update({ owner_member_id: memberRow.id, updated_at: new Date().toISOString() })
    .eq("id", tripRow.id)
    .select("*")
    .single();
  wrap("finish creating the trip", updateError);

  return { trip: toTrip(updated ?? tripRow), owner: toMember(memberRow) };
}

export async function getTrip(tripId: string): Promise<Trip | null> {
  const { data, error } = await db().from("trips").select("*").eq("id", tripId).maybeSingle();
  wrap("load the trip", error);
  return data ? toTrip(data) : null;
}

export async function getTripByInviteCode(inviteCode: string): Promise<Trip | null> {
  const { data, error } = await db()
    .from("trips")
    .select("*")
    .eq("invite_code", inviteCode)
    .maybeSingle();
  wrap("load the trip", error);
  return data ? toTrip(data) : null;
}

export async function setTripStatus(tripId: string, status: Trip["status"]): Promise<void> {
  const { error } = await db()
    .from("trips")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", tripId);
  wrap("update the trip", error);
}

// ---------------------------------------------------------------- members

export async function listMembers(tripId: string): Promise<Member[]> {
  const { data, error } = await db()
    .from("members")
    .select("*")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: true });
  wrap("load the members", error);
  return (data ?? []).map(toMember);
}

export async function getMember(memberId: string): Promise<Member | null> {
  const { data, error } = await db().from("members").select("*").eq("id", memberId).maybeSingle();
  wrap("load the member", error);
  return data ? toMember(data) : null;
}

export async function addMember(tripId: string, name: string): Promise<Member> {
  const { data, error } = await db()
    .from("members")
    .insert({ trip_id: tripId, name, role: "participant", status: "joined" })
    .select("*")
    .single();
  wrap("add you to the trip", error);
  if (!data) throw new AppError("internal", "Could not add you to the trip.");
  return toMember(data);
}

export async function setMemberStatus(memberId: string, status: Member["status"]): Promise<void> {
  const { error } = await db()
    .from("members")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", memberId);
  wrap("update the member", error);
}

// ---------------------------------------------------------------- sessions

export async function createSession(input: {
  tripId: string;
  memberId: string;
  role: Member["role"];
  tokenHash: string;
  expiresAt: string;
}): Promise<void> {
  const { error } = await db().from("participant_sessions").insert({
    trip_id: input.tripId,
    member_id: input.memberId,
    role: input.role,
    token_hash: input.tokenHash,
    expires_at: input.expiresAt,
  });
  wrap("start your session", error);
}

export async function findSession(
  tokenHash: string,
): Promise<{ tripId: string; memberId: string; role: Member["role"] } | null> {
  const { data, error } = await db()
    .from("participant_sessions")
    .select("trip_id, member_id, role, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  wrap("check your session", error);
  if (!data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  return { tripId: data.trip_id, memberId: data.member_id, role: data.role as Member["role"] };
}

// ---------------------------------------------------------------- preferences

export async function getPreference(tripId: string, memberId: string): Promise<Preference | null> {
  const { data, error } = await db()
    .from("preferences")
    .select("*")
    .eq("trip_id", tripId)
    .eq("member_id", memberId)
    .maybeSingle();
  wrap("load your preferences", error);
  return data ? toPreference(data) : null;
}

export async function listPreferences(tripId: string): Promise<Preference[]> {
  const { data, error } = await db()
    .from("preferences")
    .select("*")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: true });
  wrap("load the group's preferences", error);
  return (data ?? []).map(toPreference);
}

export async function savePreference(
  tripId: string,
  memberId: string,
  input: PreferenceInput,
  submit: boolean,
): Promise<Preference> {
  const now = new Date().toISOString();
  const payload = {
    trip_id: tripId,
    member_id: memberId,
    travel_scope: input.travelScope,
    destination_mode: input.destinationMode,
    desired_destinations: asJson(input.desiredDestinations),
    origin_city: input.originCity,
    origin_place_id: input.originPlaceId,
    origin_latitude: input.originLatitude,
    origin_longitude: input.originLongitude,
    nearest_airport: input.nearestAirport,
    comfortable_budget: input.comfortableBudget,
    maximum_budget: input.maximumBudget,
    budget_flexibility: input.budgetFlexibility,
    preferred_dates: asJson(input.preferredDates),
    possible_dates: asJson(input.possibleDates),
    unavailable_dates: asJson(input.unavailableDates),
    min_days: input.minDays,
    preferred_days: input.preferredDays,
    max_days: input.maxDays,
    trip_styles: asJson(input.tripStyles),
    must_haves: asJson(input.mustHaves),
    deal_breakers: asJson(input.dealBreakers),
    transport_modes: asJson(input.transportModes),
    updated_at: now,
    ...(submit ? { submitted_at: now } : {}),
  };

  const { data, error } = await db()
    .from("preferences")
    .upsert(payload, { onConflict: "trip_id,member_id" })
    .select("*")
    .single();
  wrap("save your preferences", error);
  if (!data) throw new AppError("internal", "Could not save your preferences.");
  if (submit) await setMemberStatus(memberId, "submitted");
  return toPreference(data);
}

// ---------------------------------------------------------- recommendations

function toOption(row: OptionRow, fits: IndividualFit[], fallbackCount: number): RecommendationOption {
  // "Works well for 4/5" must be out of the people the run was actually scored
  // for. Counting current members would silently change the denominator when
  // somebody joins after the options were built.
  const memberCount = fits.length > 0 ? fits.length : fallbackCount;

  const stored = jsonObject<Destination>(row.destination, {} as Destination);
  // The run stores a snapshot of the destination so historic options stay
  // intact. Presentational fields — artwork, wording — should still improve
  // retroactively, so the live catalog entry wins when the id still resolves.
  // Nothing shown as a number comes from here; budgets and scores were computed
  // at run time and are stored separately.
  const destination = getDestination(row.destination_id) ?? stored;

  return {
    id: row.id,
    runId: row.run_id,
    rank: row.rank,
    destinationId: row.destination_id,
    destination,
    dates: jsonObject<DateRange>(row.dates, { start: "", end: "" }),
    duration: row.duration,
    estimatedBudget: jsonObject<EstimatedBudget>(row.estimated_budget, {
      perPersonMin: 0,
      perPersonMax: 0,
      currency: "INR",
      breakdown: [],
    }),
    groupScore: Number(row.group_score),
    membersSatisfied: row.members_satisfied,
    memberCount,
    individualFit: fits,
    conflicts: jsonArray<string>(row.conflicts),
    reasons: jsonArray<string>(row.reasons),
    compromise: row.compromise,
    topStyles: jsonArray<TripStyle>(row.top_styles),
    flightSummary: jsonOrNull<FlightSummary>(row.flight_summary),
    travelSummary: jsonOrNull<TravelSummary>(row.travel_summary),
    transportSummary: jsonOrNull<TransportSummary>(row.transport_summary),
    activities: jsonArray<Activity>(row.activities),
    itinerary: jsonArray<ItineraryDay>(row.itinerary),
    sourceTimestamps: jsonObject<Record<string, string>>(row.source_timestamps, {}),
    explanationSource: row.explanation_source as RecommendationOption["explanationSource"],
  };
}

export async function createRun(tripId: string, engineVersion: string): Promise<string> {
  const { data, error } = await db()
    .from("recommendation_runs")
    .insert({ trip_id: tripId, status: "running", engine_version: engineVersion })
    .select("id")
    .single();
  wrap("start the recommendation run", error);
  if (!data) throw new AppError("internal", "Could not start the recommendation run.");
  return data.id;
}

export async function failRun(runId: string, message: string): Promise<void> {
  await db()
    .from("recommendation_runs")
    .update({ status: "failed", error_message: message, completed_at: new Date().toISOString() })
    .eq("id", runId);
}

export async function completeRun(input: {
  runId: string;
  snapshot: GroupSnapshot;
  shortfallReason: string | null;
  options: Omit<RecommendationOption, "id" | "runId" | "memberCount">[];
  members: Member[];
}): Promise<void> {
  const client = db();

  for (const option of input.options) {
    const { data: optionRow, error: optionError } = await client
      .from("recommendation_options")
      .insert({
        run_id: input.runId,
        destination_id: option.destinationId,
        destination: asJson(option.destination),
        rank: option.rank,
        group_score: option.groupScore,
        members_satisfied: option.membersSatisfied,
        dates: asJson(option.dates),
        duration: option.duration,
        estimated_budget: asJson(option.estimatedBudget),
        flight_summary: asJson(option.flightSummary),
        travel_summary: asJson(option.travelSummary),
        transport_summary: asJson(option.transportSummary),
        activities: asJson(option.activities),
        itinerary: asJson(option.itinerary),
        reasons: asJson(option.reasons),
        conflicts: asJson(option.conflicts),
        top_styles: asJson(option.topStyles),
        compromise: option.compromise,
        explanation_source: option.explanationSource,
        source_timestamps: asJson(option.sourceTimestamps),
      })
      .select("id")
      .single();
    wrap("save a recommendation", optionError);
    if (!optionRow) continue;

    if (option.individualFit.length > 0) {
      const { error: fitError } = await client.from("option_member_fits").insert(
        option.individualFit.map((fit) => ({
          option_id: optionRow.id,
          member_id: fit.memberId,
          score: fit.score,
          fit_status: fit.status,
          matched_preferences: asJson(fit.matchedPreferences),
          conflicts: asJson(fit.conflicts),
        })),
      );
      wrap("save the member fit breakdown", fitError);
    }
  }

  const { error } = await client
    .from("recommendation_runs")
    .update({
      status: "complete",
      snapshot: asJson(input.snapshot),
      shortfall_reason: input.shortfallReason,
      completed_at: new Date().toISOString(),
    })
    .eq("id", input.runId);
  wrap("finish the recommendation run", error);
}

export async function getLatestRun(tripId: string): Promise<RecommendationRun | null> {
  const client = db();
  const { data: runRow, error } = await client
    .from("recommendation_runs")
    .select("*")
    .eq("trip_id", tripId)
    .eq("status", "complete")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  wrap("load your group's results", error);
  if (!runRow) return null;

  const members = await listMembers(tripId);
  const nameById = new Map(members.map((m) => [m.id, m.name]));

  const { data: optionRows, error: optionError } = await client
    .from("recommendation_options")
    .select("*")
    .eq("run_id", runRow.id)
    .order("rank", { ascending: true });
  wrap("load your group's results", optionError);

  const optionIds = (optionRows ?? []).map((o) => o.id);
  const { data: fitRows, error: fitError } = optionIds.length
    ? await client.from("option_member_fits").select("*").in("option_id", optionIds)
    : { data: [], error: null };
  wrap("load the member fit breakdown", fitError);

  const fitsByOption = new Map<string, IndividualFit[]>();
  for (const fit of fitRows ?? []) {
    const list = fitsByOption.get(fit.option_id) ?? [];
    list.push({
      memberId: fit.member_id,
      memberName: nameById.get(fit.member_id) ?? "Member",
      score: Number(fit.score),
      status: fit.fit_status as IndividualFit["status"],
      matchedPreferences: jsonArray<string>(fit.matched_preferences),
      conflicts: jsonArray<string>(fit.conflicts),
    });
    fitsByOption.set(fit.option_id, list);
  }

  return {
    id: runRow.id,
    tripId: runRow.trip_id,
    status: runRow.status as RecommendationRun["status"],
    engineVersion: runRow.engine_version,
    createdAt: runRow.created_at,
    completedAt: runRow.completed_at,
    snapshot: jsonOrNull<GroupSnapshot>(runRow.snapshot),
    shortfallReason: runRow.shortfall_reason,
    options: (optionRows ?? []).map((row) =>
      toOption(row, fitsByOption.get(row.id) ?? [], members.length),
    ),
  };
}

// ---------------------------------------------------------------- decision

export async function getDecisionRow(tripId: string): Promise<DecisionRow | null> {
  const { data, error } = await db()
    .from("decisions")
    .select("*")
    .eq("trip_id", tripId)
    .maybeSingle();
  wrap("load the decision", error);
  return data ?? null;
}

export async function ensureDecision(tripId: string): Promise<DecisionRow> {
  const existing = await getDecisionRow(tripId);
  if (existing) return existing;
  const { data, error } = await db()
    .from("decisions")
    .insert({ trip_id: tripId, status: "open", round: 1 })
    .select("*")
    .single();
  if (error) {
    const retry = await getDecisionRow(tripId);
    if (retry) return retry;
    wrap("open the decision", error);
  }
  if (!data) throw new AppError("internal", "Could not open the decision.");
  return data;
}

export async function castVote(input: {
  tripId: string;
  memberId: string;
  optionId: string;
  round: number;
}): Promise<void> {
  const { error } = await db()
    .from("decision_votes")
    .upsert(
      {
        trip_id: input.tripId,
        member_id: input.memberId,
        option_id: input.optionId,
        round: input.round,
      },
      { onConflict: "trip_id,member_id,round" },
    );
  wrap("save your vote", error);
}

export async function listVotes(tripId: string, round: number): Promise<VoteRow[]> {
  const { data, error } = await db()
    .from("decision_votes")
    .select("*")
    .eq("trip_id", tripId)
    .eq("round", round);
  wrap("load the votes", error);
  return data ?? [];
}

export async function updateDecision(
  tripId: string,
  patch: {
    status?: DecisionRow["status"];
    round?: number;
    selectedOptionId?: string | null;
    runoffOptionIds?: string[];
  },
): Promise<void> {
  const { error } = await db()
    .from("decisions")
    .update({
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.round !== undefined ? { round: patch.round } : {}),
      ...(patch.selectedOptionId !== undefined
        ? { selected_option_id: patch.selectedOptionId }
        : {}),
      ...(patch.runoffOptionIds !== undefined
        ? { runoff_option_ids: asJson(patch.runoffOptionIds) }
        : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("trip_id", tripId);
  wrap("update the decision", error);
}

export async function getOptionById(
  tripId: string,
  optionId: string,
): Promise<RecommendationOption | null> {
  const run = await getLatestRun(tripId);
  if (!run) return null;
  return run.options.find((option) => option.id === optionId) ?? null;
}

export { conflict, notFound };
