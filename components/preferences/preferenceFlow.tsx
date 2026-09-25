"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Pencil, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Notice } from "@/components/ui/states";
import {
  StepBudget,
  StepDates,
  StepDuration,
  StepOrigin,
  StepRequirements,
  StepScope,
  StepStyle,
  StepTransport,
} from "./steps";
import { PreferenceReview } from "./review";
import { firstInvalidStep, validateStep } from "./validate";
import { ApiCallError, apiFetch } from "@/lib/client/api";
import type { Draft, StepErrors } from "./types";
import type { Preference } from "@/types/preferences";

const STEPS = [
  { title: "Where", render: StepScope },
  { title: "Budget", render: StepBudget },
  { title: "Dates", render: StepDates },
  { title: "Length", render: StepDuration },
  { title: "Style", render: StepStyle },
  { title: "Must haves", render: StepRequirements },
  { title: "Travelling from", render: StepOrigin },
  { title: "How you travel", render: StepTransport },
] as const;

const REVIEW_STEP = STEPS.length;

function emptyDraft(origin: Partial<Draft>): Draft {
  return {
    travelScope: "either",
    destinationMode: "open",
    desiredDestinations: [],
    originCity: "",
    originPlaceId: null,
    originLatitude: null,
    originLongitude: null,
    nearestAirport: null,
    comfortableBudget: 0,
    maximumBudget: 0,
    budgetFlexibility: "medium",
    preferredDates: [],
    possibleDates: [],
    unavailableDates: [],
    minDays: 3,
    preferredDays: 4,
    maxDays: 5,
    tripStyles: [],
    mustHaves: [],
    dealBreakers: [],
    transportModes: ["fly", "train", "bus", "drive"],
    ...origin,
  };
}

function fromPreference(preference: Preference): Draft {
  return {
    travelScope: preference.travelScope,
    destinationMode: preference.destinationMode,
    desiredDestinations: preference.desiredDestinations,
    originCity: preference.originCity,
    originPlaceId: preference.originPlaceId,
    originLatitude: preference.originLatitude,
    originLongitude: preference.originLongitude,
    nearestAirport: preference.nearestAirport,
    comfortableBudget: preference.comfortableBudget,
    maximumBudget: preference.maximumBudget,
    budgetFlexibility: preference.budgetFlexibility,
    preferredDates: preference.preferredDates,
    possibleDates: preference.possibleDates,
    unavailableDates: preference.unavailableDates,
    minDays: preference.minDays,
    preferredDays: preference.preferredDays,
    maxDays: preference.maxDays,
    tripStyles: preference.tripStyles,
    mustHaves: preference.mustHaves,
    dealBreakers: preference.dealBreakers,
    transportModes:
      preference.transportModes.length > 0
        ? preference.transportModes
        : ["fly", "train", "bus", "drive"],
  };
}

export function PreferenceFlow({
  tripId,
  existing,
  originDefault,
  alreadySubmitted,
  joinedLate = false,
}: {
  tripId: string;
  existing: Preference | null;
  originDefault: Partial<Draft>;
  alreadySubmitted: boolean;
  /** They are answering after the group already generated options. */
  joinedLate?: boolean;
}) {
  const router = useRouter();
  const storageKey = `tt_draft_${tripId}`;

  const [draft, setDraft] = React.useState<Draft>(() =>
    existing ? fromPreference(existing) : emptyDraft(originDefault),
  );
  const [step, setStep] = React.useState(0);
  const [errors, setErrors] = React.useState<StepErrors>({});
  const [status, setStatus] = React.useState<"idle" | "saving" | "submitting">("idle");
  const [message, setMessage] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const headingRef = React.useRef<HTMLHeadingElement>(null);

  // A local draft survives a refresh or an accidental tab close between saves.
  // This has to happen after mount: reading localStorage during render would
  // make the server and client markup disagree and break hydration.
  React.useEffect(() => {
    if (existing) return;
    try {
      const stored = window.localStorage.getItem(storageKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- must run after mount, see above
      if (stored) setDraft((current) => ({ ...current, ...(JSON.parse(stored) as Draft) }));
    } catch {
      /* a corrupt draft is not worth failing the page over */
    }
  }, [existing, storageKey]);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(draft));
    } catch {
      /* storage can be full or blocked; the server copy is the real one */
    }
  }, [draft, storageKey]);

  function update(patch: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setErrors({});
    setMessage(null);
  }

  function goTo(next: number) {
    setStep(next);
    setErrors({});
    // Move focus so a screen reader announces the new step.
    window.requestAnimationFrame(() => headingRef.current?.focus());
  }

  function next() {
    const found = validateStep(step, draft);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    goTo(step + 1);
  }

  async function save(submit: boolean) {
    if (status !== "idle") return;
    setFormError(null);

    if (submit) {
      const invalid = firstInvalidStep(draft);
      if (invalid !== null) {
        setErrors(validateStep(invalid, draft));
        goTo(invalid);
        return;
      }
    }

    setStatus(submit ? "submitting" : "saving");
    try {
      await apiFetch(`/api/trips/${tripId}/preferences`, {
        method: "POST",
        json: { submit, preference: draft },
      });
      if (submit) {
        try {
          window.localStorage.removeItem(storageKey);
        } catch {
          /* ignored */
        }
        // Someone catching up after a run should land on the options the group
        // is already looking at, not on a waiting screen.
        router.push(joinedLate ? `/trip/${tripId}/results` : `/trip/${tripId}/waiting`);
        router.refresh();
        return;
      }
      setMessage("Saved. You can close this and come back to the same link.");
      setStatus("idle");
    } catch (error) {
      setFormError(
        error instanceof ApiCallError ? error.message : "We could not save your answers.",
      );
      setStatus("idle");
    }
  }

  const isReview = step === REVIEW_STEP;
  const Current = isReview ? null : STEPS[step].render;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-ink-soft">
          {isReview ? "Review" : `Step ${step + 1} of ${STEPS.length}`}
          {isReview ? null : (
            <span className="ml-2 text-ink-faint">{STEPS[step].title}</span>
          )}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void save(false)}
          loading={status === "saving"}
        >
          <Save className="h-4 w-4" aria-hidden />
          Save for later
        </Button>
      </div>

      <Progress
        className="mt-3"
        value={step + 1}
        max={REVIEW_STEP + 1}
        label={`Step ${step + 1} of ${REVIEW_STEP + 1}`}
      />

      {message ? (
        <Notice tone="info" className="mt-4">
          {message}
        </Notice>
      ) : null}

      {alreadySubmitted ? (
        <Notice tone="warning" className="mt-4">
          You have already submitted. Any change you save here replaces your earlier answers.
        </Notice>
      ) : null}

      <h1 ref={headingRef} tabIndex={-1} className="sr-only">
        {isReview ? "Review your preferences" : STEPS[step].title}
      </h1>

      <div className="mt-6 animate-fade" key={step}>
        {Current ? (
          <Current draft={draft} update={update} errors={errors} />
        ) : (
          <PreferenceReview draft={draft} onEdit={goTo} />
        )}
      </div>

      {formError ? (
        <Notice tone="error" className="mt-6">
          {formError}
        </Notice>
      ) : null}

      <div className="mt-10 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="ghost"
          onClick={() => goTo(Math.max(0, step - 1))}
          disabled={step === 0}
          className="sm:w-auto"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back
        </Button>

        {isReview ? (
          <Button size="lg" onClick={() => void save(true)} loading={status === "submitting"}>
            <Check className="h-4 w-4" aria-hidden />
            Submit my preferences
          </Button>
        ) : (
          <Button size="lg" onClick={next}>
            Next
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        )}
      </div>

      {isReview ? (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-faint">
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          You can come back and change any of this until the group generates options.
        </p>
      ) : null}
    </div>
  );
}
