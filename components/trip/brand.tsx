import Link from "next/link";
import { Tent } from "lucide-react";
import { PRODUCT } from "@/lib/config";
import { GROUP } from "@/lib/group";
import { cn } from "@/lib/utils";

export function Wordmark({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)}>
      <span className="flex h-9 w-9 -rotate-6 items-center justify-center rounded-lg border-[1.5px] border-primary text-primary transition-transform group-hover:rotate-0">
        <Tent className="h-4.5 w-4.5" aria-hidden />
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-serif text-xl font-semibold italic tracking-tight">{PRODUCT.name}</span>
        <span className="hidden font-hand text-base text-ink-faint sm:block">
          for the {GROUP.countWord} of us
        </span>
      </span>
    </Link>
  );
}

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b border-dashed border-border-strong/70 bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Wordmark />
        {children}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-dashed border-border-strong/70 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 text-sm text-ink-faint sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <p className="font-hand text-2xl text-ink-soft">Made for {GROUP.roll}.</p>
          <p className="mt-1">{PRODUCT.closingLine}</p>
        </div>
        <p className="max-w-sm sm:text-right">
          Nothing here books anything — it is just the part where we decide, and the place we keep
          the photos afterwards.
        </p>
      </div>
    </footer>
  );
}
