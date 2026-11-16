import { TOUR_STATUSES, type TourStatus } from "@waypoint/shared";
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader, TourStatusBadge } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { loadOr404 } from "@/lib/page-data";
import { cn, formatDate } from "@/lib/utils";
import { requirePageUser } from "@/server/auth";
import { listTours } from "@/server/services/tours";
import { HealthBadge } from "@/components/insights";
import { getProjectInsights } from "@/server/insights/service";

export const metadata: Metadata = { title: "Tours" };

const FILTERS: { value: TourStatus | undefined; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "DRAFT", label: "Drafts" },
  { value: "PUBLISHED", label: "Published" },
  { value: "ARCHIVED", label: "Archived" },
];

export default async function ToursPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const [{ projectId }, sp] = await Promise.all([params, searchParams]);
  const status = TOUR_STATUSES.find((s) => s === sp.status);
  const user = await requirePageUser();
  const [tours, insights] = await loadOr404(() =>
    Promise.all([listTours(user.id, projectId, status), getProjectInsights(user.id, projectId)]),
  );
  const healthOf = new Map(insights.tours.map((t) => [t.id, t.health]));
  const base = `/dashboard/projects/${projectId}`;

  return (
    <>
      <PageHeader
        title="Tours"
        actions={
          <Button asChild>
            <Link href={`${base}/tours/new`}>
              <Plus aria-hidden /> New tour
            </Link>
          </Button>
        }
      />
      <nav aria-label="Filter by status" className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = f.value === status;
          return (
            <Link
              key={f.label}
              href={f.value ? `${base}/tours?status=${f.value}` : `${base}/tours`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-full border px-3 py-1 text-xs",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted",
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      {tours.length === 0 ? (
        <EmptyState
          variant="tour"
          title={status ? `No ${status.toLowerCase()} tours` : "No tours yet"}
          description={
            status
              ? "Try another filter."
              : "A tour is a sequence of tooltips that guides visitors through your site."
          }
          action={
            !status && (
              <Button asChild>
                <Link href={`${base}/tours/new`}>Create a tour</Link>
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <caption className="sr-only">Tours in this project</caption>
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">
                  Name
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Health
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Start URL
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Trigger
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  Steps
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tours.map((t) => (
                <tr key={t.id} className="hover:bg-muted/40">
                  <td className="px-4 py-2.5">
                    <Link href={`${base}/tours/${t.id}`} className="font-medium hover:underline">
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    {healthOf.get(t.id) ? (
                      <HealthBadge health={healthOf.get(t.id)!} size="sm" />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <TourStatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">{t.startUrl}</td>
                  <td className="px-4 py-2.5 text-xs">
                    {t.triggerType === "AUTO" ? "Automatic" : "Manual"}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{t._count.steps}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {formatDate(t.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
