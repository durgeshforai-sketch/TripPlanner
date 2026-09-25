"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Accessible card-style choice built on native inputs so keyboard and screen
 * reader behaviour comes for free.
 */
export function ChoiceCard({
  type,
  name,
  value,
  checked,
  onChange,
  title,
  description,
  icon,
  disabled,
}: {
  type: "radio" | "checkbox";
  name: string;
  value: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}) {
  const id = `${name}-${value}`;
  return (
    <label
      htmlFor={id}
      className={cn(
        "group relative flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors",
        checked
          ? "border-primary bg-primary-soft"
          : "border-border bg-surface hover:border-border-strong",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <input
        id={id}
        type={type}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border transition-colors",
          type === "radio" ? "rounded-full" : "rounded-md",
          checked ? "border-primary bg-primary text-primary-fg" : "border-border-strong bg-surface",
        )}
      >
        {checked ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-medium text-ink">
          {icon}
          {title}
        </span>
        {description ? (
          <span className="mt-0.5 block text-xs text-ink-soft">{description}</span>
        ) : null}
      </span>
    </label>
  );
}
