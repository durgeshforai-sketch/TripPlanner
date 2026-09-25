"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Sparkles } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Notice } from "@/components/ui/states";
import { ApiCallError, apiFetch } from "@/lib/client/api";

const STAGES = [
  "Reading everyone's answers…",
  "Finding dates that work for the group…",
  "Checking which destinations fit everyone's limits…",
  "Looking at travel options and places to go…",
  "Writing up the trade-offs…",
];

/**
 * The run is genuinely computed server-side, so the button reflects real work:
 * the stage messages advance on a timer only to describe what is happening, and
 * navigation waits for the request to actually finish.
 */
export function GenerateButton({
  tripId,
  label = "Find our options",
  force = false,
  variant = "primary",
  size = "lg",
  icon = "sparkles",
}: {
  tripId: string;
  label?: string;
  /** Build options without the people who have not answered yet. */
  force?: boolean;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  icon?: "sparkles" | "refresh";
}) {
  const router = useRouter();
  const [running, setRunning] = React.useState(false);
  const [stage, setStage] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 2600);
    return () => clearInterval(timer);
  }, [running]);

  async function run() {
    if (running) return;
    setRunning(true);
    setStage(0);
    setError(null);
    try {
      await apiFetch(`/api/trips/${tripId}/recommendations`, {
        method: "POST",
        json: { force },
      });
      router.push(`/trip/${tripId}/results`);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof ApiCallError ? caught.message : "We could not build your options.",
      );
      setRunning(false);
    }
  }

  const Icon = icon === "refresh" ? RefreshCw : Sparkles;

  return (
    <div>
      <Button size={size} variant={variant} onClick={run} loading={running}>
        {running ? null : <Icon className="h-4 w-4" aria-hidden />}
        {running ? "Working on it" : label}
      </Button>

      {running ? (
        <p aria-live="polite" className="mt-3 text-sm text-ink-soft">
          {STAGES[stage]}
        </p>
      ) : null}

      {error ? (
        <Notice tone="error" className="mt-4">
          {error}
        </Notice>
      ) : null}
    </div>
  );
}
