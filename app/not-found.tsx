import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFooter, SiteHeader } from "@/components/trip/brand";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <div className="mx-auto w-full max-w-lg px-4 py-24 text-center sm:px-6">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-muted text-ink-faint">
            <Compass className="h-5 w-5" aria-hidden />
          </span>
          <h1 className="mt-5 text-2xl font-semibold">We could not find that page</h1>
          <p className="mt-3 text-ink-soft">
            The link may be old, or the trip it pointed at no longer exists.
          </p>
          <Button asChild className="mt-6">
            <Link href="/">Back to the start</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
