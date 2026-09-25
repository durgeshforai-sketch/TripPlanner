"use client";

import * as React from "react";
import { Bus, Car, Globe2, Home, Plane, Sparkles, TrainFront, X } from "lucide-react";
import { AvailabilityCalendar } from "@/components/calendar/availabilityCalendar";
import { ChipInput } from "@/components/preferences/chipInput";
import { PlaceAutocomplete, type PlaceValue } from "@/components/preferences/placeAutocomplete";
import { ChoiceCard } from "@/components/ui/choice";
import { Field, Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/states";
import { cn, formatINR } from "@/lib/utils";
import { findDestinationByName } from "@/data/destinations";
import {
  COMMON_DEAL_BREAKERS,
  COMMON_MUST_HAVES,
  TRIP_STYLES,
  TRIP_STYLE_LABELS,
  type StylePriority,
  type TripStyle,
} from "@/types/preferences";
import { TRANSPORT_MODES, TRANSPORT_LABELS, type TransportMode } from "@/types/transport";
import type { Draft, StepErrors } from "./types";

interface StepProps {
  draft: Draft;
  update: (patch: Partial<Draft>) => void;
  errors: StepErrors;
}

export function StepScope({ draft, update, errors }: StepProps) {
  return (
    <div className="space-y-8">
      <fieldset>
        <legend className="text-lg font-semibold">Where do you want to go?</legend>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <ChoiceCard
            type="radio"
            name="scope"
            value="domestic"
            checked={draft.travelScope === "domestic"}
            onChange={() => update({ travelScope: "domestic" })}
            title="Domestic"
            description="Somewhere in the country"
            icon={<Home className="h-4 w-4" aria-hidden />}
          />
          <ChoiceCard
            type="radio"
            name="scope"
            value="international"
            checked={draft.travelScope === "international"}
            onChange={() => update({ travelScope: "international" })}
            title="International"
            description="Passport out"
            icon={<Globe2 className="h-4 w-4" aria-hidden />}
          />
          <ChoiceCard
            type="radio"
            name="scope"
            value="either"
            checked={draft.travelScope === "either"}
            onChange={() => update({ travelScope: "either" })}
            title="Open to both"
            description="Whatever works"
            icon={<Plane className="h-4 w-4" aria-hidden />}
          />
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-lg font-semibold">
          Do you already have a destination in mind?
        </legend>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ChoiceCard
            type="radio"
            name="destinationMode"
            value="specific"
            checked={draft.destinationMode === "specific"}
            onChange={() => update({ destinationMode: "specific" })}
            title="I have some places in mind"
            description="We will always score them for the group"
          />
          <ChoiceCard
            type="radio"
            name="destinationMode"
            value="open"
            checked={draft.destinationMode === "open"}
            onChange={() => update({ destinationMode: "open", desiredDestinations: [] })}
            title="I'm open to suggestions"
            description="Go with whatever fits everyone"
          />
        </div>

        {draft.destinationMode === "specific" ? (
          <div className="mt-5 space-y-3">
            <DestinationPicker
              value={draft.desiredDestinations}
              onChange={(desiredDestinations) => update({ desiredDestinations })}
              invalid={Boolean(errors.desiredDestinations)}
            />
            {errors.desiredDestinations ? (
              <p role="alert" className="text-xs font-medium text-notfit">
                {errors.desiredDestinations}
              </p>
            ) : null}
          </div>
        ) : null}
      </fieldset>
    </div>
  );
}

function DestinationPicker({
  value,
  onChange,
  invalid,
}: {
  value: Draft["desiredDestinations"];
  onChange: (value: Draft["desiredDestinations"]) => void;
  invalid: boolean;
}) {
  const [picked, setPicked] = React.useState<PlaceValue | null>(null);

  function add(place: PlaceValue | null) {
    setPicked(null);
    if (!place) return;
    if (value.some((entry) => entry.name.toLowerCase() === place.name.toLowerCase())) return;
    if (value.length >= 10) return;

    // Resolve to our catalog where we can, so the engine scores it directly.
    const known = findDestinationByName(place.name);
    onChange([
      ...value,
      {
        destinationId: known?.id ?? null,
        name: place.name,
        placeId: place.placeId,
        latitude: place.latitude ?? known?.latitude ?? null,
        longitude: place.longitude ?? known?.longitude ?? null,
      },
    ]);
  }

  return (
    <div>
      <label htmlFor="destination-search" className="block text-sm font-medium">
        Add the places you are thinking of
      </label>
      <div className="mt-2">
        <PlaceAutocomplete
          id="destination-search"
          kind="destination"
          value={picked}
          invalid={invalid}
          placeholder="Search a city or region"
          onChange={add}
        />
      </div>

      {value.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {value.map((entry) => (
            <li
              key={entry.name}
              className="flex items-center gap-1.5 rounded-full border border-primary bg-primary-soft px-3.5 py-2 text-sm text-primary"
            >
              {entry.name}
              {entry.destinationId ? null : (
                <span className="text-[10px] uppercase tracking-wide opacity-70">new</span>
              )}
              <button
                type="button"
                aria-label={`Remove ${entry.name}`}
                onClick={() => onChange(value.filter((v) => v.name !== entry.name))}
                className="rounded-full p-0.5 hover:bg-black/5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function StepBudget({ draft, update, errors }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">What budget feels comfortable for you?</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Per person, for the whole trip — flights, stay, food, everything.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Comfortable budget"
          htmlFor="comfortable-budget"
          hint="What you would happily spend"
          error={errors.comfortableBudget}
          required
        >
          <MoneyInput
            id="comfortable-budget"
            value={draft.comfortableBudget}
            onChange={(comfortableBudget) => update({ comfortableBudget })}
            invalid={Boolean(errors.comfortableBudget)}
          />
        </Field>

        <Field
          label="Absolute maximum"
          htmlFor="maximum-budget"
          hint="A hard limit — we never suggest above it"
          error={errors.maximumBudget}
          required
        >
          <MoneyInput
            id="maximum-budget"
            value={draft.maximumBudget}
            onChange={(maximumBudget) => update({ maximumBudget })}
            invalid={Boolean(errors.maximumBudget)}
          />
        </Field>
      </div>

      <fieldset>
        <legend className="text-sm font-medium">How flexible are you?</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {(
            [
              ["low", "Not really", "Stick close to my comfortable number"],
              ["medium", "Somewhat", "I could stretch for the right trip"],
              ["high", "Very", "The maximum is the real number"],
            ] as const
          ).map(([value, title, description]) => (
            <ChoiceCard
              key={value}
              type="radio"
              name="budgetFlexibility"
              value={value}
              checked={draft.budgetFlexibility === value}
              onChange={() => update({ budgetFlexibility: value })}
              title={title}
              description={description}
            />
          ))}
        </div>
      </fieldset>

      {draft.comfortableBudget > 0 && draft.maximumBudget >= draft.comfortableBudget ? (
        <Notice>
          We will look for trips around {formatINR(draft.comfortableBudget)} and never suggest
          anything above {formatINR(draft.maximumBudget)} for you.
        </Notice>
      ) : null}
    </div>
  );
}

function MoneyInput({
  id,
  value,
  onChange,
  invalid,
}: {
  id: string;
  value: number;
  onChange: (value: number) => void;
  invalid: boolean;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-faint">
        ₹
      </span>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        step={500}
        value={value === 0 ? "" : String(value)}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        placeholder="20000"
        aria-invalid={invalid ? true : undefined}
        className={cn("pl-7", invalid && "border-notfit")}
      />
    </div>
  );
}

export function StepDates({ draft, update, errors }: StepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">When could you travel?</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Mark the dates that work and the ones that definitely do not. We will highlight
          holidays and long weekends for you.
        </p>
      </div>

      <AvailabilityCalendar
        value={{
          preferred: draft.preferredDates,
          possible: draft.possibleDates,
          unavailable: draft.unavailableDates,
        }}
        onChange={(value) =>
          update({
            preferredDates: value.preferred,
            possibleDates: value.possible,
            unavailableDates: value.unavailable,
          })
        }
      />

      {errors.preferredDates ? (
        <p role="alert" className="text-xs font-medium text-notfit">
          {errors.preferredDates}
        </p>
      ) : null}
    </div>
  );
}

const QUICK_DURATIONS: { label: string; min: number; preferred: number; max: number }[] = [
  { label: "2–3 days", min: 2, preferred: 3, max: 3 },
  { label: "4–5 days", min: 4, preferred: 4, max: 5 },
  { label: "6–7 days", min: 5, preferred: 6, max: 7 },
  { label: "7+ days", min: 7, preferred: 8, max: 12 },
];

export function StepDuration({ draft, update, errors }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">How long are you planning to travel?</h2>
        <p className="mt-1 text-sm text-ink-soft">Counting travel days at both ends.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_DURATIONS.map((option) => {
          const on =
            draft.minDays === option.min &&
            draft.preferredDays === option.preferred &&
            draft.maxDays === option.max;
          return (
            <button
              key={option.label}
              type="button"
              aria-pressed={on}
              onClick={() =>
                update({
                  minDays: option.min,
                  preferredDays: option.preferred,
                  maxDays: option.max,
                })
              }
              className={cn(
                "rounded-full border px-4 py-2 text-sm transition-colors",
                on
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border bg-surface text-ink-soft hover:border-border-strong",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Minimum" htmlFor="min-days" hint="Below this is not worth it" required>
          <DayInput
            id="min-days"
            value={draft.minDays}
            onChange={(minDays) => update({ minDays })}
          />
        </Field>
        <Field label="Ideal" htmlFor="preferred-days" hint="Your sweet spot" required>
          <DayInput
            id="preferred-days"
            value={draft.preferredDays}
            onChange={(preferredDays) => update({ preferredDays })}
            invalid={Boolean(errors.preferredDays)}
          />
        </Field>
        <Field
          label="Maximum"
          htmlFor="max-days"
          hint="The most you can be away"
          error={errors.maxDays ?? errors.preferredDays}
          required
        >
          <DayInput
            id="max-days"
            value={draft.maxDays}
            onChange={(maxDays) => update({ maxDays })}
            invalid={Boolean(errors.maxDays)}
          />
        </Field>
      </div>
    </div>
  );
}

function DayInput({
  id,
  value,
  onChange,
  invalid,
}: {
  id: string;
  value: number;
  onChange: (value: number) => void;
  invalid?: boolean;
}) {
  return (
    <Input
      id={id}
      type="number"
      inputMode="numeric"
      min={1}
      max={60}
      value={value === 0 ? "" : String(value)}
      onChange={(event) => onChange(Number(event.target.value) || 0)}
      aria-invalid={invalid ? true : undefined}
      className={cn(invalid && "border-notfit")}
    />
  );
}

const PRIORITIES: { value: StylePriority; label: string }[] = [
  { value: "must", label: "Must have" },
  { value: "nice", label: "Nice to have" },
  { value: "dont-care", label: "Don't care" },
];

export function StepStyle({ draft, update, errors }: StepProps) {
  function setPriority(style: TripStyle, priority: StylePriority) {
    const others = draft.tripStyles.filter((entry) => entry.style !== style);
    update({
      tripStyles:
        priority === "dont-care" ? others : [...others, { style, priority }],
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">What kind of trip do you want?</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Mark the things you would be disappointed to miss as a must. Those carry more weight
          than the rest.
        </p>
      </div>

      <ul className="space-y-2">
        {TRIP_STYLES.map((style) => {
          const current =
            draft.tripStyles.find((entry) => entry.style === style)?.priority ?? "dont-care";
          return (
            <li
              key={style}
              className={cn(
                "flex flex-col gap-3 rounded-2xl border p-3 sm:flex-row sm:items-center sm:justify-between",
                current === "must"
                  ? "border-primary/50 bg-primary-soft/50"
                  : current === "nice"
                    ? "border-border bg-surface"
                    : "border-border bg-surface",
              )}
            >
              <span className="text-sm font-medium">{TRIP_STYLE_LABELS[style]}</span>
              <div
                role="radiogroup"
                aria-label={`How much do you want ${TRIP_STYLE_LABELS[style]}?`}
                className="flex gap-1 rounded-full border border-border bg-bg p-1"
              >
                {PRIORITIES.map((priority) => (
                  <button
                    key={priority.value}
                    type="button"
                    role="radio"
                    aria-checked={current === priority.value}
                    onClick={() => setPriority(style, priority.value)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                      current === priority.value
                        ? "bg-primary text-primary-fg"
                        : "text-ink-soft hover:text-ink",
                    )}
                  >
                    {priority.label}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>

      {errors.tripStyles ? (
        <p role="alert" className="text-xs font-medium text-notfit">
          {errors.tripStyles}
        </p>
      ) : null}
    </div>
  );
}

export function StepRequirements({ draft, update }: StepProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">What makes or breaks it for you?</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Deal-breakers are treated as hard limits. Must-haves push an option up, but will not
          rule one out on their own.
        </p>
      </div>

      <ChipInput
        id="must-haves"
        label="Must haves"
        suggestions={COMMON_MUST_HAVES}
        value={draft.mustHaves}
        onChange={(mustHaves) => update({ mustHaves })}
      />

      <ChipInput
        id="deal-breakers"
        label="Deal breakers"
        suggestions={COMMON_DEAL_BREAKERS}
        value={draft.dealBreakers}
        onChange={(dealBreakers) => update({ dealBreakers })}
        tone="notfit"
        placeholder="Something else you won't do"
      />

      <Notice tone="info">
        <Sparkles className="mr-1.5 inline h-4 w-4 align-text-bottom" aria-hidden />
        We only enforce deal-breakers we can genuinely check against a destination. Anything else
        — like room arrangements — is passed on to the group as a booking note.
      </Notice>
    </div>
  );
}

export function StepOrigin({ draft, update, errors }: StepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Where are you travelling from?</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Everyone in the group can start from a different city — we work out flights and travel
          time for each one separately.
        </p>
      </div>

      <Field
        label="Your city"
        htmlFor="origin-city"
        hint="Or your nearest airport"
        error={errors.originCity}
        required
      >
        <PlaceAutocomplete
          id="origin-city"
          kind="city"
          invalid={Boolean(errors.originCity)}
          value={
            draft.originCity
              ? {
                  name: draft.originCity,
                  placeId: draft.originPlaceId,
                  latitude: draft.originLatitude,
                  longitude: draft.originLongitude,
                }
              : null
          }
          placeholder="Bengaluru"
          onChange={(place) =>
            update({
              originCity: place?.name ?? "",
              originPlaceId: place?.placeId ?? null,
              originLatitude: place?.latitude ?? null,
              originLongitude: place?.longitude ?? null,
            })
          }
        />
      </Field>
    </div>
  );
}

const TRANSPORT_DETAIL: Record<
  TransportMode,
  { icon: typeof Plane; description: string }
> = {
  fly: { icon: Plane, description: "Quickest over long distances" },
  train: { icon: TrainFront, description: "Comfortable, good for overnight" },
  bus: { icon: Bus, description: "Usually the cheapest" },
  drive: { icon: Car, description: "Flexible, cheap when shared" },
};

export function StepTransport({ draft, update, errors }: StepProps) {
  function toggle(mode: TransportMode, on: boolean) {
    const next = on
      ? [...draft.transportModes, mode]
      : draft.transportModes.filter((entry) => entry !== mode);
    update({ transportModes: Array.from(new Set(next)) });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">How are you happy to travel?</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Anything under 300km we will plan by road — a short flight costs more and,
          once airport time is counted, is not even faster. Untick anything you would
          rather not do.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {TRANSPORT_MODES.map((mode) => {
          const detail = TRANSPORT_DETAIL[mode];
          return (
            <ChoiceCard
              key={mode}
              type="checkbox"
              name="transportModes"
              value={mode}
              checked={draft.transportModes.includes(mode)}
              onChange={(on) => toggle(mode, on)}
              title={TRANSPORT_LABELS[mode]}
              description={detail.description}
              icon={<detail.icon className="h-4 w-4" aria-hidden />}
            />
          );
        })}
      </div>

      {errors.transportModes ? (
        <p role="alert" className="text-xs font-medium text-notfit">
          {errors.transportModes}
        </p>
      ) : null}

      <Notice tone="info">
        This is about how you get there, not what you do once you arrive. If everyone
        rules out a mode, we will not suggest it.
      </Notice>
    </div>
  );
}
