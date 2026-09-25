import { Skeleton } from "@/components/ui/skeleton";

export default function ResultsLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-3 h-10 w-80 max-w-full" />
      <Skeleton className="mt-3 h-4 w-56" />

      <Skeleton className="mt-8 h-52 w-full rounded-3xl" />

      <p className="mt-10 text-sm text-ink-soft" role="status">
        Building your group&rsquo;s recommendations…
      </p>
      <div className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-[30rem] w-full rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
