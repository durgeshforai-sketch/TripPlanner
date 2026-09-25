import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { SiteFooter, SiteHeader } from "@/components/trip/brand";
import { JoinForm } from "@/components/trip/joinForm";
import { getMembership } from "@/lib/auth/session";
import { getTripByInviteCode, listMembers } from "@/lib/db/repo";

export const metadata = { title: "Join a trip" };

export default async function JoinPage({ params }: PageProps<"/join/[inviteCode]">) {
  const { inviteCode } = await params;
  const trip = await getTripByInviteCode(inviteCode.toUpperCase());
  if (!trip) notFound();

  // Someone returning to the link they already used goes straight back in.
  const existing = await getMembership(trip.id);
  if (existing) redirect(`/trip/${trip.id}`);

  const members = await listMembers(trip.id);

  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <div className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6 sm:py-16">
          <div className="animate-rise">
            <p className="text-sm font-medium text-primary">You have been invited to</p>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{trip.name}</h1>
            {trip.description ? (
              <p className="mt-3 text-lg text-ink-soft">{trip.description}</p>
            ) : null}
          </div>

          {members.length > 0 ? (
            <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-4">
              <div className="flex -space-x-2">
                {members.slice(0, 6).map((member) => (
                  <Avatar key={member.id} name={member.name} className="ring-2 ring-surface" />
                ))}
              </div>
              <p className="text-sm text-ink-soft">
                {members.map((m) => m.name).slice(0, 3).join(", ")}
                {members.length > 3 ? ` and ${members.length - 3} more` : ""}
                {members.length === 1 ? " is" : " are"} already in.
              </p>
            </div>
          ) : null}

          <JoinForm tripId={trip.id} inviteCode={trip.inviteCode} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
