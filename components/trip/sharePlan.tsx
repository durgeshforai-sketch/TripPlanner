"use client";

import * as React from "react";
import { Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SharePlanButton({ summary, url }: { summary: string; url: string }) {
  const [done, setDone] = React.useState(false);

  async function share() {
    const text = `${summary}\n${url}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Our trip is booked in", text, url });
        return;
      } catch {
        // The person dismissed the sheet, or sharing is unavailable — fall back.
      }
    }
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* the plan is on screen either way */
    }
    setDone(true);
    setTimeout(() => setDone(false), 2200);
  }

  return (
    <Button variant="secondary" size="lg" onClick={share}>
      {done ? <Check className="h-4 w-4" aria-hidden /> : <Share2 className="h-4 w-4" aria-hidden />}
      {done ? "Copied to clipboard" : "Share plan"}
    </Button>
  );
}
