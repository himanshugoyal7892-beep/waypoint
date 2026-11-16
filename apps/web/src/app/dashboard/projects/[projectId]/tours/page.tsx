import { TOUR_STATUSES, type TourStatus } from "@waypoint/shared";
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader, TabNav } from "@/components/layout";
import { ToursTable } from "@/components/tours/tours-table";
import { Button } from "@/components/ui/button";
import { loadOr404 } from "@/lib/page-data";
import { requirePageUser } from "@/server/auth";
import { listTours } from "@/server/services/tours";
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
  const [all, insights] = await loadOr404(() =>
    Promise.all([listTours(user.id, projectId), getProjectInsights(user.id, projectId)]),
  );
  const tours = status ? all.filter((t) => t.status === status) : all;
  const countOf = (s?: TourStatus) => (s ? all.filter((t) => t.status === s).length : all.length);
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
      <TabNav
        label="Filter by status"
        current={status ?? "ALL"}
        tabs={FILTERS.map((f) => ({
          key: f.value ?? "ALL",
          label: f.label,
          href: f.value ? `${base}/tours?status=${f.value}` : `${base}/tours`,
          count: countOf(f.value),
        }))}
      />

      {tours.length === 0 ? (
        <EmptyState
          variant="tour"
          title={status ? `No ${status.toLowerCase()} tours` : "No tours yet"}
          description={
            status
              ? "Tours move here when you change their status."
              : "A tour is a sequence of tooltips that guides visitors through your site."
          }
          action={
            status ? (
              <Button variant="outline" asChild>
                <Link href={`${base}/tours`}>Show all tours</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href={`${base}/tours/new`}>Create a tour</Link>
              </Button>
            )
          }
        />
      ) : (
        <ToursTable
          base={base}
          rows={tours.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            status: t.status,
            startUrl: t.startUrl,
            triggerType: t.triggerType,
            steps: t._count.steps,
            updatedAt: t.updatedAt.toISOString(),
            health: healthOf.get(t.id) ?? null,
          }))}
        />
      )}
    </>
  );
}
