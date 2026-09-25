import { Skeleton } from "@/components/ui/skeleton";

export default function CompareLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-4 h-10 w-56" />
      <p className="mt-6 text-sm text-ink-soft" role="status">
        Lining the options up…
      </p>
      <Skeleton className="mt-4 h-[32rem] w-full rounded-3xl" />
    </div>
  );
}
