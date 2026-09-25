"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Gavel, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/states";
import { DestinationArt } from "@/components/trip/destinationArt";
import { ApiCallError, apiFetch } from "@/lib/client/api";
import { cn } from "@/lib/utils";
import type { DecisionState, RecommendationOption } from "@/types/recommendation";

/**
 * Voting UI. It shows the split as it happens and never resolves a tie on the
 * group's behalf — a tie opens one runoff and then it is a conversation.
 */
export function DecisionPanel({
  tripId,
  options,
  meId,
  initial,
}: {
  tripId: string;
  options: RecommendationOption[];
  meId: string;
  initial: DecisionState;
}) {
  const router = useRouter();
  const [decision, setDecision] = React.useState(initial);
  const [pending, setPending] = React.useState<string | null>(null);
  const [finalising, setFinalising] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const myVote = decision.votes.find((vote) => vote.memberId === meId)?.optionId ?? null;
  const everyoneVoted = decision.votes.every((vote) => vote.optionId !== null);
  const waiting = decision.votes.filter((vote) => vote.optionId === null);

  const ballot =
    decision.status === "runoff" && decision.tiedOptionIds.length > 0
      ? options.filter((option) => decision.tiedOptionIds.includes(option.id))
      : options;

  const countFor = (optionId: string) =>
    decision.tally.find((entry) => entry.optionId === optionId)?.count ?? 0;

  async function vote(optionId: string) {
    if (pending || decision.status === "final") return;
    setPending(optionId);
    setError(null);
    try {
      const data = await apiFetch<{ decision: DecisionState }>(
        `/api/trips/${tripId}/decision/vote`,
        { method: "POST", json: { optionId } },
      );
      setDecision(data.decision);
    } catch (caught) {
      setError(caught instanceof ApiCallError ? caught.message : "We could not save your vote.");
    } finally {
      setPending(null);
    }
  }

  async function finalise() {
    if (finalising) return;
    setFinalising(true);
    setError(null);
    setMessage(null);
    try {
      const data = await apiFetch<{
        result: { outcome: "decided" | "runoff" | "incomplete"; missingMembers: string[] };
        decision: DecisionState;
      }>(`/api/trips/${tripId}/decision/finalize`, { method: "POST" });

      setDecision(data.decision);

      if (data.result.outcome === "decided") {
        router.push(`/trip/${tripId}/confirmed`);
        router.refresh();
        return;
      }
      if (data.result.outcome === "runoff") {
        setMessage(
          "Your group is split. There is a second round between the options that tied — everyone votes again.",
        );
      } else {
        setMessage(`Still waiting on ${data.result.missingMembers.join(", ")}.`);
      }
    } catch (caught) {
      setError(caught instanceof ApiCallError ? caught.message : "We could not close the vote.");
    } finally {
      setFinalising(false);
    }
  }

  return (
    <div className="space-y-8">
      {decision.status === "runoff" ? (
        <Notice tone="warning">
          Your group was split. This is the second round, between the options that tied.
        </Notice>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {ballot.map((option) => {
          const chosen = myVote === option.id;
          const votes = countFor(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => void vote(option.id)}
              disabled={decision.status === "final" || pending !== null}
              aria-pressed={chosen}
              className={cn(
                "card overflow-hidden text-left transition-colors disabled:opacity-70",
                chosen ? "border-primary ring-2 ring-primary" : "hover:border-border-strong",
              )}
            >
              <div className="relative h-24">
                <DestinationArt destination={option.destination} />
                {chosen ? (
                  <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-fg">
                    <Check className="h-4 w-4" aria-hidden />
                  </span>
                ) : null}
              </div>
              <div className="p-4">
                <p className="font-semibold">{option.destination.name}</p>
                <p className="mt-0.5 text-sm text-ink-faint">
                  Works well for {option.membersSatisfied}/{option.memberCount}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Badge tone={votes > 0 ? "primary" : "neutral"}>
                    <Users className="h-3 w-3" aria-hidden />
                    {votes} {votes === 1 ? "vote" : "votes"}
                  </Badge>
                  {chosen ? <span className="text-xs text-primary">Your pick</span> : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wider text-ink-faint">
          How the group is voting
        </h2>
        <ul className="mt-3 space-y-2">
          {decision.votes.map((vote) => {
            const option = options.find((entry) => entry.id === vote.optionId);
            return (
              <li
                key={vote.memberId}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3"
              >
                <Avatar name={vote.memberName} />
                <p className="flex-1 text-sm font-medium">
                  {vote.memberName}
                  {vote.memberId === meId ? <span className="text-ink-faint"> (you)</span> : null}
                </p>
                {option ? (
                  <Badge tone="primary">{option.destination.name}</Badge>
                ) : (
                  <Badge tone="neutral">Not voted yet</Badge>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {error ? <Notice tone="error">{error}</Notice> : null}
      {message ? <Notice tone="warning">{message}</Notice> : null}

      <div className="flex flex-col gap-3 rounded-3xl border border-border bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">
            {everyoneVoted ? "Everyone has voted." : `Waiting on ${waiting.length}.`}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {everyoneVoted
              ? "Close the vote to lock the trip in."
              : waiting.map((vote) => vote.memberName).join(", ")}
          </p>
        </div>
        <Button size="lg" onClick={finalise} disabled={!everyoneVoted} loading={finalising}>
          <Gavel className="h-4 w-4" aria-hidden />
          Close the vote
        </Button>
      </div>
    </div>
  );
}
