import Link from "next/link";
import { notFound } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFooter, SiteHeader } from "@/components/trip/brand";
import { getMembership } from "@/lib/auth/session";
import { getTrip } from "@/lib/db/repo";

/**
 * Every page under /trip is membership-gated here, so a guessed trip id never
 * renders anything about someone else's group.
 */
export default async function TripLayout({ children, params }: LayoutProps<"/trip/[tripId]">) {
  const { tripId } = await params;
  const membership = await getMembership(tripId);

  if (!membership) {
    const trip = await getTrip(tripId);
    if (!trip) notFound();

    return (
      <>
        <SiteHeader />
        <main id="main" className="flex-1">
          <div className="mx-auto w-full max-w-lg px-4 py-20 text-center sm:px-6">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-muted text-ink-faint">
              <LockKeyhole className="h-5 w-5" aria-hidden />
            </span>
            <h1 className="mt-5 text-2xl font-semibold">This trip is private</h1>
            <p className="mt-3 text-ink-soft">
              You need the invite link from whoever set this trip up. Nothing about the group is
              visible without it.
            </p>
            <Button asChild className="mt-6">
              <Link href="/create?mode=join">I have an invite code</Link>
            </Button>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <SiteHeader>
        <span className="truncate text-sm text-ink-soft">
          <span className="hidden sm:inline">Signed in as </span>
          <span className="font-medium text-ink">{membership.member.name}</span>
        </span>
      </SiteHeader>
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
