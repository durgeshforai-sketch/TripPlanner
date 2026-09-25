import * as React from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-strong bg-surface-muted/60 px-6 py-10 text-center",
        className,
      )}
    >
      <span className="text-ink-faint">{icon ?? <Info className="h-6 w-6" />}</span>
      <p className="text-sm font-medium text-ink">{title}</p>
      {description ? <p className="max-w-sm text-sm text-ink-soft">{description}</p> : null}
      {action}
    </div>
  );
}

export function Notice({
  tone = "neutral",
  children,
  className,
}: {
  tone?: "neutral" | "warning" | "error" | "info";
  children: React.ReactNode;
  className?: string;
}) {
  const tones = {
    neutral: "bg-surface-muted text-ink-soft border-border",
    warning: "bg-partial-soft text-partial border-partial/25",
    error: "bg-notfit-soft text-notfit border-notfit/25",
    info: "bg-good-soft text-good border-good/25",
  } as const;
  return (
    <div className={cn("rounded-xl border px-4 py-3 text-sm", tones[tone], className)} role="status">
      {children}
    </div>
  );
}
