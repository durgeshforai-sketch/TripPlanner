"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, LinkIcon, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Notice } from "@/components/ui/states";
import { PlaceAutocomplete, type PlaceValue } from "@/components/preferences/placeAutocomplete";
import { ApiCallError, apiFetch } from "@/lib/client/api";

type Mode = "create" | "join" | null;

export function CreateOrJoin({ initialMode }: { initialMode: Mode }) {
  const [mode, setMode] = React.useState<Mode>(initialMode);

  if (mode === null) {
    return (
      <div className="animate-rise">
        <h1 className="text-3xl font-semibold sm:text-4xl">How do you want to get started?</h1>
        <p className="mt-3 text-ink-soft">
          One person sets the trip up. Everyone else joins with the link they share.
        </p>
        <div className="mt-8 grid gap-3">
          <button
            type="button"
            onClick={() => setMode("create")}
            className="card group flex items-center gap-4 p-6 text-left transition-colors hover:border-primary"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <Users className="h-5 w-5" aria-hidden />
            </span>
            <span className="flex-1">
              <span className="block font-semibold">Create a new trip</span>
              <span className="mt-1 block text-sm text-ink-soft">
                Name it, say how many people are coming, and get a link to share.
              </span>
            </span>
            <ArrowRight
              className="h-5 w-5 shrink-0 text-ink-faint transition-transform group-hover:translate-x-1"
              aria-hidden
            />
          </button>

          <button
            type="button"
            onClick={() => setMode("join")}
            className="card group flex items-center gap-4 p-6 text-left transition-colors hover:border-primary"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <LinkIcon className="h-5 w-5" aria-hidden />
            </span>
            <span className="flex-1">
              <span className="block font-semibold">Join a trip</span>
              <span className="mt-1 block text-sm text-ink-soft">
                Someone already started one and sent you a link or a code.
              </span>
            </span>
            <ArrowRight
              className="h-5 w-5 shrink-0 text-ink-faint transition-transform group-hover:translate-x-1"
              aria-hidden
            />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-rise">
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => setMode(null)}>
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back
      </Button>
      {mode === "create" ? <CreateTripForm /> : <JoinWithCode />}
    </div>
  );
}

function CreateTripForm() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [expectedMembers, setExpectedMembers] = React.useState("5");
  const [ownerName, setOwnerName] = React.useState("");
  const [origin, setOrigin] = React.useState<PlaceValue | null>(null);
  const [originText, setOriginText] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = "Give the trip a name your group will recognise";
    if (ownerName.trim().length < 2) next.ownerName = "Tell us your name";
    const count = Number(expectedMembers);
    if (!Number.isInteger(count) || count < 2 || count > 20)
      next.expectedMembers = "Between 2 and 20 people";
    if (!origin && originText.trim().length < 2)
      next.origin = "Where would you be travelling from?";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const data = await apiFetch<{ tripId: string; inviteCode: string }>("/api/trips", {
        method: "POST",
        json: {
          name: name.trim(),
          description: description.trim() || undefined,
          expectedMembers: Number(expectedMembers),
          ownerName: ownerName.trim(),
          originCity: origin?.name ?? originText.trim(),
          originPlaceId: origin?.placeId ?? null,
          originLatitude: origin?.latitude ?? null,
          originLongitude: origin?.longitude ?? null,
        },
      });
      router.push(`/trip/${data.tripId}/invite`);
    } catch (error) {
      setFormError(
        error instanceof ApiCallError ? error.message : "We could not create the trip.",
      );
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <h1 className="text-3xl font-semibold sm:text-4xl">Create a new trip</h1>
      <p className="mt-3 text-ink-soft">
        You can change any of this later. Nothing is shared until you send the link.
      </p>

      <div className="mt-8 space-y-5">
        <Field label="Trip name" htmlFor="trip-name" error={errors.name} required>
          <Input
            id="trip-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Palak's Birthday Trip"
            maxLength={120}
            aria-invalid={errors.name ? true : undefined}
          />
        </Field>

        <Field
          label="What's the vibe?"
          htmlFor="trip-description"
          hint="Optional — one line is plenty."
        >
          <Textarea
            id="trip-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Beaches, good food and fun"
            rows={2}
            maxLength={400}
          />
        </Field>

        <Field
          label="How many people are coming?"
          htmlFor="trip-members"
          hint="Including you. A rough number is fine."
          error={errors.expectedMembers}
          required
        >
          <Input
            id="trip-members"
            type="number"
            inputMode="numeric"
            min={2}
            max={20}
            value={expectedMembers}
            onChange={(e) => setExpectedMembers(e.target.value)}
            className="max-w-28"
            aria-invalid={errors.expectedMembers ? true : undefined}
          />
        </Field>

        <Field label="Your name" htmlFor="owner-name" error={errors.ownerName} required>
          <Input
            id="owner-name"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="Palak"
            maxLength={60}
            aria-invalid={errors.ownerName ? true : undefined}
          />
        </Field>

        <Field
          label="Where are you travelling from?"
          htmlFor="owner-origin"
          hint="Your city or nearest airport. Everyone else adds their own."
          error={errors.origin}
          required
        >
          <PlaceAutocomplete
            id="owner-origin"
            kind="city"
            value={origin}
            invalid={Boolean(errors.origin)}
            placeholder="Bengaluru"
            onChange={(value) => {
              setOrigin(value);
              if (value) setOriginText(value.name);
            }}
          />
        </Field>
      </div>

      {formError ? (
        <Notice tone="error" className="mt-6">
          {formError}
        </Notice>
      ) : null}

      <Button type="submit" size="lg" className="mt-8 w-full sm:w-auto" loading={submitting}>
        {submitting ? "Creating your trip" : "Create trip"}
      </Button>
    </form>
  );
}

function JoinWithCode() {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const cleaned = extractCode(code);
    if (cleaned.length < 6) {
      setError("That does not look like an invite code or link.");
      return;
    }
    router.push(`/join/${cleaned}`);
  }

  return (
    <form onSubmit={submit} noValidate>
      <h1 className="text-3xl font-semibold sm:text-4xl">Join a trip</h1>
      <p className="mt-3 text-ink-soft">
        Paste the link you were sent, or just the code at the end of it.
      </p>

      <div className="mt-8">
        <Field label="Invite link or code" htmlFor="invite-code" error={error} required>
          <Input
            id="invite-code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError(null);
            }}
            placeholder="K4M2XPQ7RTBN"
            autoCapitalize="characters"
            aria-invalid={error ? true : undefined}
          />
        </Field>
      </div>

      <Button type="submit" size="lg" className="mt-8 w-full sm:w-auto">
        Continue
      </Button>
    </form>
  );
}

/** Accepts a full invite URL as readily as a bare code. */
function extractCode(input: string): string {
  const trimmed = input.trim();
  const fromUrl = /\/join\/([A-Za-z0-9]+)/.exec(trimmed);
  return (fromUrl?.[1] ?? trimmed).toUpperCase().replace(/[^A-Z0-9]/g, "");
}
