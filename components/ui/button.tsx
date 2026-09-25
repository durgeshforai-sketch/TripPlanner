"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "gradient-primary text-primary-fg shadow-[0_4px_14px_-4px_var(--primary)] hover:shadow-[0_8px_22px_-6px_var(--primary)] hover:brightness-110",
        secondary:
          "bg-surface text-ink border border-border-strong shadow-[0_1px_2px_rgba(23,20,58,0.04)] hover:border-primary/40 hover:bg-primary-soft/40",
        ghost: "text-ink-soft hover:bg-surface-muted hover:text-ink",
        accent: "bg-accent text-white hover:brightness-105",
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
