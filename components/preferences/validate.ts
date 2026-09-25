import type { Draft, StepErrors } from "./types";

/**
 * Client-side gate for each step. The server re-validates the whole object with
 * the same rules through Zod — this exists so people are told immediately, not
 * so the server can trust it.
 */
export function validateStep(step: number, draft: Draft): StepErrors {
  const errors: StepErrors = {};

  if (step === 0 && draft.destinationMode === "specific" && draft.desiredDestinations.length === 0) {
    errors.desiredDestinations = "Add at least one place, or switch to 'open to suggestions'.";
  }

  if (step === 1) {
    if (!draft.comfortableBudget || draft.comfortableBudget <= 0) {
      errors.comfortableBudget = "Put in a number you would be happy with.";
    }
    if (!draft.maximumBudget || draft.maximumBudget <= 0) {
      errors.maximumBudget = "We need a hard limit to work with.";
    } else if (draft.maximumBudget < draft.comfortableBudget) {
      errors.maximumBudget = "Your maximum can't be lower than your comfortable budget.";
    }
  }

  if (step === 2 && draft.preferredDates.length === 0 && draft.possibleDates.length === 0) {
    errors.preferredDates = "Mark at least a few days you could travel.";
  }

  if (step === 3) {
    if (draft.minDays < 1) errors.minDays = "At least one day.";
    if (draft.preferredDays < draft.minDays) {
      errors.preferredDays = "Your ideal length can't be shorter than your minimum.";
    }
    if (draft.maxDays < draft.preferredDays) {
      errors.maxDays = "Your maximum can't be shorter than your ideal length.";
    }
  }

  if (step === 4 && draft.tripStyles.length === 0) {
    errors.tripStyles = "Pick at least one thing you want out of this trip.";
  }

  if (step === 6 && draft.originCity.trim().length < 2) {
    errors.originCity = "We need to know where you are starting from.";
  }

  if (step === 7 && draft.transportModes.length === 0) {
    errors.transportModes = "Pick at least one way you are willing to travel.";
  }

  return errors;
}

export function firstInvalidStep(draft: Draft): number | null {
  for (let step = 0; step <= 7; step++) {
    if (Object.keys(validateStep(step, draft)).length > 0) return step;
  }
  return null;
}
