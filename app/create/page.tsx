import { SiteFooter, SiteHeader } from "@/components/trip/brand";
import { CreateOrJoin } from "@/components/trip/createOrJoin";
import { RoadTripScene } from "@/components/illustrations/scenes";

export const metadata = { title: "Start a trip" };

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;

  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1 surface-gradient">
        <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
          <CreateOrJoin initialMode={mode === "join" ? "join" : null} />
          <div className="mt-12 overflow-hidden rounded-3xl">
            <RoadTripScene />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
