"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/states";
import { ApiCallError, apiFetch } from "@/lib/client/api";

export function JoinForm({ tripId, inviteCode }: { tripId: string; inviteCode: string }) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (name.trim().length < 2) {
      setError("Tell the group what to call you.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/api/trips/${tripId}/join`, {
        method: "POST",
        json: { inviteCode, name: name.trim() },
      });
      router.push(`/trip/${tripId}/preferences`);
    } catch (caught) {
      setError(caught instanceof ApiCallError ? caught.message : "We could not add you.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mt-8">
      <Field label="What's your name?" htmlFor="join-name" required error={error}>
        <div className="flex items-center gap-3">
          {name.trim().length > 1 ? <Avatar name={name} className="h-11 w-11" /> : null}
          <Input
            id="join-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            placeholder="Riya"
            maxLength={60}
            autoFocus
            aria-invalid={error ? true : undefined}
          />
        </div>
      </Field>

      <p className="mt-3 text-sm text-ink-faint">
        No sign-up. Your answers stay private to this group.
      </p>

      <Button type="submit" size="lg" className="mt-6 w-full sm:w-auto" loading={submitting}>
        {submitting ? "Joining" : "Join trip"}
        {submitting ? null : <ArrowRight className="h-4 w-4" aria-hidden />}
      </Button>

      <Notice className="mt-6">
        Next you will answer seven quick questions about budget, dates and what you want out of
        the trip. It takes about three minutes.
      </Notice>
    </form>
  );
}
