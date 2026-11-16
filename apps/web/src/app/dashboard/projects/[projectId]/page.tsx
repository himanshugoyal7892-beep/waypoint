import { CalendarDays, CheckCircle2, Play, Plus, Rocket } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChecklistCard, HealthBadge } from "@/components/insights";
import { EmptyState, PageHeader, StatCard, TourStatusBadge } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/misc";
import { loadOr404 } from "@/lib/page-data";
import { requirePageUser } from "@/server/auth";
import { getProjectInsights } from "@/server/insights/service";

export const metadata: Metadata = { title: "Project overview" };

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await requirePageUser();
  const p = await loadOr404(() => getProjectInsights(user.id, projectId));
  const base = `/dashboard/projects/${p.id}`;
  // Worst first: that's where attention pays off.
  const tours = [...p.tours].sort((a, b) => a.health.score - b.health.score);
  const originMissing = !p.checklist.items.find((i) => i.key === "origin")!.done;

  return (
    <>
      <PageHeader
        title={p.name}
        description={p.domain}
        breadcrumbs={[{ href: "/dashboard/projects", label: "Projects" }]}
        actions={
          <Button asChild>
            <Link href={`${base}/tours/new`}>
              <Plus aria-hidden /> New tour
            </Link>
          </Button>
        }
      />
      {originMissing && (
        <Alert tone="warning" title="Add your website address" className="mb-6">
          Tours can&apos;t load until your site is listed under{" "}
          <Link href={`${base}/settings#allowedOrigins`} className="underline">
            Settings → Allowed websites
          </Link>
          .
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <ChecklistCard checklist={p.checklist} />
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            label="Visits"
            value={p.kpis.visits7d}
            hint="Last 7 days"
            icon={<CalendarDays />}
          />
          <StatCard
            label="Tours started"
            value={p.kpis.starts7d}
            hint="Last 7 days"
            icon={<Play />}
            tone="slate"
          />
          <StatCard
            label="Completed"
            value={p.kpis.completions7d}
            hint={
              p.kpis.starts7d
                ? `${Math.round((p.kpis.completions7d / p.kpis.starts7d) * 100)}% of starts`
                : "Last 7 days"
            }
            icon={<CheckCircle2 />}
            tone="green"
          />
          <StatCard
            label="Live tours"
            value={p.kpis.liveTours}
            hint={`${p.tours.length} in total`}
            icon={<Rocket />}
            tone="amber"
          />
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Tour health</CardTitle>
            <CardDescription>
              A score out of 100 from completion, reliability, length, copy and setup. Lowest first.
            </CardDescription>
          </div>
          <Link href={`${base}/tours`} className="shrink-0 text-sm text-primary hover:underline">
            All tours
          </Link>
        </CardHeader>
        <CardContent>
          {tours.length === 0 ? (
            <EmptyState
              variant="tour"
              className="border-none bg-transparent py-6"
              title="No tours yet"
              description="Build your first tour by clicking elements on your website."
              action={
                <Button asChild>
                  <Link href={`${base}/tours/new`}>Create a tour</Link>
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {tours.slice(0, 8).map((t) => (
                <li key={t.id}>
                  <Link
                    href={`${base}/tours/${t.id}`}
                    className="-mx-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-1 rounded-lg px-2 py-3 hover:bg-muted/50 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
                  >
                    <HealthBadge health={t.health} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium">{t.name}</span>
                        <TourStatusBadge status={t.status} />
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {t.health.tips[0] ?? "Nothing to fix. Nice work."}
                      </span>
                    </span>
                    <span className="col-start-2 text-xs tabular-nums text-muted-foreground sm:col-start-3 sm:text-right">
                      {t.started30d} started · {t.completed30d} finished
                      <span className="block">last 30 days</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
