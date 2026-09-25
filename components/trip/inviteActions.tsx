"use client";

import * as React from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InviteActions({ url, tripName }: { url: string; tripName: string }) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard can be blocked; the link is visible on screen either way.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  const message = `Planning ${tripName} — add what you want out of it here and we'll get 3 options that work for everyone: ${url}`;

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button onClick={copy} className="sm:flex-1">
        {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
        {copied ? "Link copied" : "Copy invite link"}
      </Button>
      <Button asChild variant="secondary" className="sm:flex-1">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          Share on WhatsApp
        </a>
      </Button>
      <span aria-live="polite" className="sr-only">
        {copied ? "Invite link copied to clipboard" : ""}
      </span>
    </div>
  );
}

export function CopyReminderButton({ url, label = "Copy reminder link" }: { url: string; label?: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
        } catch {
          /* ignored — the link is shown on the page too */
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      }}
    >
      {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      {copied ? "Copied" : label}
    </Button>
  );
}
