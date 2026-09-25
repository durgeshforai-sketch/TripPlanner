"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap active:translate-y-[2px]",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-fg shadow-[0_3px_0_var(--primary-shade)] hover:bg-primary-hover active:shadow-[0_1px_0_var(--primary-shade)]",
        secondary:
          "bg-surface text-ink border border-border-strong shadow-[0_2px_0_var(--border-strong)] hover:bg-surface-muted active:shadow-none",
        ghost: "text-ink-soft hover:bg-surface-muted hover:text-ink",
        accent:
          "bg-accent text-primary-fg shadow-[0_3px_0_color-mix(in_srgb,var(--accent)_60%,black)] hover:brightness-110 active:shadow-none",
        danger: "bg-notfit-soft text-notfit border border-notfit/30 hover:bg-notfit/15",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-5 text-sm",
        lg: "h-13 px-7 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            <span>{children}</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";
