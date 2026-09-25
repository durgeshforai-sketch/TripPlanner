import Link from "next/link";
import { Compass } from "lucide-react";
import { PRODUCT } from "@/lib/config";
import { cn } from "@/lib/utils";

export function Wordmark({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-fg">
        <Compass className="h-4.5 w-4.5" aria-hidden />
      </span>
      <span>{PRODUCT.name}</span>
    </Link>
  );
}

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Wordmark />
        {children}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/70 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 text-sm text-ink-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>{PRODUCT.closingLine}</p>
        <p>
          {PRODUCT.name} — a group decision tool. It does not book anything for you.
        </p>
      </div>
    </footer>
  );
}
