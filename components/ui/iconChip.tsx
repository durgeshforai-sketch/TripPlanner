import * as React from "react";
import { cn } from "@/lib/utils";

const TONES = {
  primary: "bg-primary-soft text-primary",
  accent: "bg-accent-soft text-accent",
  strong: "bg-strong-soft text-strong",
  good: "bg-good-soft text-good",
  partial: "bg-partial-soft text-partial",
  neutral: "bg-surface-muted text-ink-soft",
} as const;

/** Small tinted square behind an icon — the product's main decorative motif. */
export function IconChip({
  children,
  tone = "primary",
  size = "md",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONES;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl",
        size === "sm" ? "h-7 w-7" : size === "lg" ? "h-12 w-12 rounded-2xl" : "h-9 w-9",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
