import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
  {
    variants: {
      tone: {
        neutral: "bg-surface-muted text-ink-soft border border-border",
        primary: "bg-primary-soft text-primary border border-primary/20",
        accent: "bg-accent-soft text-accent border border-accent/20",
        strong: "bg-strong-soft text-strong border border-strong/20",
        good: "bg-good-soft text-good border border-good/20",
        partial: "bg-partial-soft text-partial border border-partial/25",
        notfit: "bg-notfit-soft text-notfit border border-notfit/25",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
