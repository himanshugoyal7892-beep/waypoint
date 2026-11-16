import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading tours…</span>
      <div className="mb-8 flex items-end justify-between">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-28" />
      </div>
      <Skeleton className="mb-6 h-10 w-80 rounded-xl" />
      <Skeleton className="mb-3 h-9 w-72" />
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-6 px-4 py-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-3 w-36" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-6 w-14 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
