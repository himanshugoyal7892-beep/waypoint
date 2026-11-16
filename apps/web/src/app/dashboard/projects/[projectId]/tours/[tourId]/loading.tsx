import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading tour…</span>
      <Skeleton className="mb-3 h-4 w-16" />
      <div className="mb-8 flex items-end justify-between">
        <Skeleton className="h-9 w-96 max-w-full" />
        <Skeleton className="h-9 w-48" />
      </div>
      <Skeleton className="mb-6 h-10 w-96 max-w-full rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-3 rounded-xl border border-border bg-card p-5">
          <Skeleton className="h-6 w-28" />
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton className="size-7 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64" />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-6">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
