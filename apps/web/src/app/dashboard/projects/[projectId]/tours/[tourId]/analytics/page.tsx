import { CheckCircle2, CircleSlash, Play, SearchX, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState, PageHeader, StatCard, TourStatusBadge } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/misc";
import { loadOr404 } from "@/lib/page-data";
import { cn, formatDate } from "@/lib/utils";
import { RANGE_DAYS, getTourAnalytics, parseRange } from "@/server/analytics/service";
import { requirePageUser } from "@/server/auth";
import { getTour } from "@/server/services/tours";

export const metadata: Metadata = { title: "Tour analytics" };

const pct = (n: number) => `${Math.round(n * 100)}%`;

const BAR_TONES = { indigo: "bg-primary", green: "bg-[#1d9a5b]", amber: "bg-pin" } as const;

function Bar({
  value,
  label,
  tone = "indigo",
}: {
  value: number;
  label: string;
  tone?: keyof typeof BAR_TONES;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-2.5 w-full min-w-24 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`${label}: ${pct(value)}`}
      >
        <div className={cn("h-full rounded-full", BAR_TONES[tone])} style={{ width: pct(value) }} />
      </div>
      <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
        {pct(value)}
      </span>
    </div>
  );
}

export default async function TourAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; tourId: string }>;
  searchParams: Promise<{ days?: string }>;
}) {
  const [{ projectId, tourId }, sp] = await Promise.all([params, searchParams]);
  const days = parseRange(sp.days);
  const user = await requirePageUser();
  const [tour, a] = await loadOr404(() =>
    Promise.all([getTour(user.id, tourId), getTourAnalytics(user.id, tourId, days)]),
  );
  if (tour.projectId !== projectId) notFound();
  const tourHref = `/dashboard/projects/${projectId}/tours/${tourId}`;

  return (
    <>
      <PageHeader
        title={tour.name}
        description={`Analytics for the last ${days} days, ${formatDate(a.range.from)} to ${formatDate(a.range.to)}`}
        breadcrumbs={[
          { href: `/dashboard/projects/${projectId}/tours`, label: "Tours" },
          { href: tourHref, label: tour.name },
          { href: `${tourHref}/analytics`, label: "Analytics" },
        ]}
        actions={<TourStatusBadge status={tour.status} />}
      />

      <nav aria-label="Date range" className="mb-5 flex gap-2">
        {RANGE_DAYS.map((d) => (
          <Link
            key={d}
            href={`${tourHref}/analytics?days=${d}`}
            aria-current={d === days ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-xs",
              d === days
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-muted",
            )}
          >
            Last {d} days
          </Link>
        ))}
      </nav>

      {a.totalStarts === 0 ? (
        <EmptyState
          variant="data"
          title="No visitors yet"
          description={
            tour.status === "PUBLISHED"
              ? "Numbers appear here as soon as someone sees this tour. Runs through the preview button count too; builder previews don't."
              : "Publish the tour, then numbers appear here as visitors see it."
          }
        />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Visitors started" value={a.uniqueVisitorsStarted} icon={<Users />} />
            <StatCard label="Total starts" value={a.totalStarts} icon={<Play />} tone="slate" />
            <StatCard
              label="Completed"
              value={a.totalCompletions}
              hint={`${pct(a.completionRate)} of starts`}
              icon={<CheckCircle2 />}
              tone="green"
            />
            <StatCard
              label="Skipped"
              value={a.totalSkips}
              hint={`${pct(a.skipRate)} of starts`}
              icon={<CircleSlash />}
              tone="amber"
            />
            <StatCard
              label="Missing elements"
              value={a.elementNotFound}
              hint="Steps whose element was missing"
              icon={<SearchX />}
              tone="slate"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Completion</CardTitle>
              <CardDescription>
                Share of tour starts that reached the end, or were skipped.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-sm">Completion rate</p>
                <Bar value={a.completionRate} label="Completion rate" tone="green" />
              </div>
              <div>
                <p className="mb-1 text-sm">Skip rate</p>
                <Bar value={a.skipRate} label="Skip rate" tone="amber" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Drop-off by step</CardTitle>
              <CardDescription>
                How many of the visitors who started reached each step, and how many left before it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">Visitors reaching each step</caption>
                  <thead className="border-b border-border text-left text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="py-2 pr-3 font-medium">
                        Step
                      </th>
                      <th scope="col" className="py-2 pr-3 text-right font-medium">
                        Visitors
                      </th>
                      <th scope="col" className="w-2/5 py-2 pr-3 font-medium">
                        Reached
                      </th>
                      <th scope="col" className="py-2 pr-3 text-right font-medium">
                        Dropped before
                      </th>
                      <th scope="col" className="py-2 text-right font-medium">
                        Not found
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {a.steps.map((s) => (
                      <tr key={s.stepId}>
                        <td className="py-2.5 pr-3">
                          <span className="mr-2 inline-flex size-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                            {s.stepOrder}
                          </span>
                          {s.label}
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{s.uniqueViewers}</td>
                        <td className="py-2.5 pr-3">
                          <Bar value={s.reachRate} label={`Step ${s.stepOrder} reached`} />
                        </td>
                        <td
                          className={cn(
                            "py-2.5 pr-3 text-right tabular-nums",
                            s.dropOffFromPrevious > 0 && "text-amber-700",
                          )}
                        >
                          {s.stepOrder === 1 ? "—" : s.dropOffFromPrevious}
                        </td>
                        <td
                          className={cn(
                            "py-2.5 text-right tabular-nums",
                            s.elementNotFound > 0 && "font-medium text-destructive",
                          )}
                        >
                          {s.elementNotFound}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {a.elementNotFound > 0 && (
            <Alert tone="warning" title="Some steps couldn't find their element">
              The website may have changed. Open the visual builder and re-select the element for
              the steps marked in &quot;Not found&quot;.
            </Alert>
          )}
          <p className="text-xs text-muted-foreground">
            Counts are approximate and update as events arrive. Your own runs through the preview
            button are included; builder previews are not.
          </p>
        </div>
      )}
    </>
  );
}
