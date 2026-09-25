"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Suggested values plus free text. Entries are trimmed, length-capped and
 * de-duplicated case-insensitively before they leave the component, matching
 * what the server enforces.
 */
export function ChipInput({
  id,
  label,
  suggestions,
  value,
  onChange,
  tone = "primary",
  placeholder = "Add your own",
  max = 12,
}: {
  id: string;
  label: string;
  suggestions: readonly string[];
  value: string[];
  onChange: (value: string[]) => void;
  tone?: "primary" | "notfit";
  placeholder?: string;
  max?: number;
}) {
  const [draft, setDraft] = React.useState("");
  const selected = new Set(value.map((v) => v.toLowerCase()));

  function toggle(entry: string) {
    const key = entry.toLowerCase();
    onChange(
      selected.has(key)
        ? value.filter((v) => v.toLowerCase() !== key)
        : value.length >= max
          ? value
          : [...value, entry],
    );
  }

  function addDraft() {
    const cleaned = draft.trim().slice(0, 60);
    if (!cleaned || selected.has(cleaned.toLowerCase()) || value.length >= max) {
      setDraft("");
      return;
    }
    onChange([...value, cleaned]);
    setDraft("");
  }

  const active =
    tone === "notfit"
      ? "border-notfit bg-notfit-soft text-notfit"
      : "border-primary bg-primary-soft text-primary";

  const custom = value.filter((v) => !suggestions.some((s) => s.toLowerCase() === v.toLowerCase()));

  return (
    <fieldset>
      <legend className="text-sm font-medium text-ink">{label}</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {suggestions.map((suggestion) => {
          const on = selected.has(suggestion.toLowerCase());
          return (
            <button
              key={suggestion}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(suggestion)}
              className={cn(
                "rounded-full border px-3.5 py-2 text-sm transition-colors",
                on ? active : "border-border bg-surface text-ink-soft hover:border-border-strong",
              )}
            >
              {suggestion}
            </button>
          );
        })}

        {custom.map((entry) => (
          <span
            key={entry}
            className={cn("flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm", active)}
          >
            {entry}
            <button
              type="button"
              aria-label={`Remove ${entry}`}
              onClick={() => toggle(entry)}
              className="rounded-full p-0.5 hover:bg-black/5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>

      {value.length < max ? (
        <div className="mt-3 flex gap-2">
          <Input
            id={id}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addDraft();
              }
            }}
            placeholder={placeholder}
            maxLength={60}
            aria-label={`${label} — add your own`}
            className="max-w-xs"
          />
          <button
            type="button"
            onClick={addDraft}
            disabled={draft.trim().length === 0}
            className="flex h-11 items-center gap-1.5 rounded-xl border border-border px-4 text-sm font-medium text-ink-soft hover:border-border-strong disabled:opacity-40"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add
          </button>
        </div>
      ) : (
        <p className="mt-3 text-xs text-ink-faint">That&rsquo;s the maximum of {max}.</p>
      )}
    </fieldset>
  );
}
