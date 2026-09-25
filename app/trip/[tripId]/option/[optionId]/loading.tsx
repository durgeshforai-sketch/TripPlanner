import { Skeleton } from "@/components/ui/skeleton";

export default function OptionLoading() {
  return (
    <div>
      <Skeleton className="h-44 w-full rounded-none sm:h-60" />
      <div className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
        <Skeleton className="-mt-8 h-10 w-64 max-w-full" />
        <Skeleton className="mt-4 h-4 w-40" />
        <p className="mt-8 text-sm text-ink-soft" role="status">
          Looking at travel options and places…
        </p>
        <Skeleton className="mt-4 h-12 w-full rounded-full" />
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-3xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
