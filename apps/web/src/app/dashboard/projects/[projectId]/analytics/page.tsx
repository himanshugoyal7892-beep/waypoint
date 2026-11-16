import { CalendarDays, Repeat, UserCheck, UserPlus, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader, StatCard, TourStatusBadge } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadOr404 } from "@/lib/page-data";
import { cn, formatDate } from "@/lib/utils";
import { RANGE_DAYS, getProjectAnalytics, parseRange } from "@/server/analytics/service";
import { requirePageUser } from "@/server/auth";

export const metadata: Metadata = { title: "Analytics" };

const pct = (n: number) => `${Math.round(n * 100)}%`;
const AUDIENCE_LABEL = {
  ALL: "Everyone",
  NEW_USERS: "New visitors",
  DORMANT_USERS: "Returning after a break",
  EXISTING_USERS: "Existing visitors",
} as const;

const dayLabel = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

function ago(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return formatDate(iso);
}

export default async function ProjectAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ days?: string }>;
}) {
  const [{ projectId }, sp] = await Promise.all([params, searchParams]);
  const days = parseRange(sp.days);
  const user = await requirePageUser();
  const a = await loadOr404(() => getProjectAnalytics(user.id, projectId, days));
  const base = `/dashboard/projects/${projectId}`;
  const peak = Math.max(1, ...a.series.map((d) => d.visits));
  const hasVisits = a.totals.visits > 0 || a.recentVisitors.length > 0;

  return (
    <>
      <PageHeader
        title="Analytics"
        description={`Visits and tours for the last ${days} days, ${formatDate(a.range.from)} to ${formatDate(a.range.to)}`}
        breadcrumbs={[
          { href: base, label: "Project" },
          { href: `${base}/analytics`, label: "Analytics" },
        ]}
      />

      <nav aria-label="Date range" className="mb-5 flex gap-2">
        {RANGE_DAYS.map((d) => (
          <Link
            key={d}
            href={`${base}/analytics?days=${d}`}
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

      <div className="space-y-6">
        {!hasVisits ? (
          <EmptyState
            variant="data"
            title="No visits recorded yet"
            description="Visits are counted once the snippet is on your site (directly or through Google Tag Manager, including its Preview mode). The presenter’s preview bookmark doesn’t count visits."
            action={
              <Link href={`${base}/install`} className="text-sm text-primary hover:underline">
                Open install instructions
              </Link>
            }
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard label="Visits" value={a.totals.visits} icon={<CalendarDays />} />
              <StatCard
                label="Visitors"
                value={a.totals.activeVisitors}
                hint="Seen in this period"
                icon={<Users />}
                tone="slate"
              />
              <StatCard
                label="New visitors"
                value={a.totals.newVisitors}
                hint="First seen in this period"
                icon={<UserPlus />}
                tone="green"
              />
              <StatCard
                label="Returning visitors"
                value={a.totals.returningVisitors}
                hint="First seen before this period"
                icon={<Repeat />}
                tone="amber"
              />
              <StatCard
                label="Logged in"
                value={a.totals.identifiedVisitors}
                hint={
                  a.totals.activeVisitors
                    ? `${pct(a.totals.identifiedVisitors / a.totals.activeVisitors)} of visitors`
                    : undefined
                }
                icon={<UserCheck />}
                tone="slate"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Visits per day</CardTitle>
                <CardDescription>
                  A visit ends after 30 minutes without activity. Days are in UTC.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className="flex h-40 items-end gap-[2px]"
                  role="img"
                  aria-label={`Visits per day, peak ${peak}`}
                >
                  {a.series.map((d) => (
                    <div
                      key={d.day}
                      className="group relative flex h-full flex-1 flex-col justify-end"
                      title={`${dayLabel(d.day)}: ${d.visits} visits, ${d.newVisitors} new, ${d.identifiedVisits} logged in`}
                    >
                      <div
                        className={cn(
                          "w-full rounded-t-sm",
                          d.visits ? "bg-primary group-hover:bg-pin" : "bg-muted",
                        )}
                        style={{
                          height: d.visits ? `${Math.max(4, (d.visits / peak) * 100)}%` : "2px",
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>{dayLabel(a.series[0]!.day)}</span>
                  <span>Peak: {peak} visits</span>
                  <span>Today</span>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Tours</CardTitle>
            <CardDescription>
              Starts and completions in this period. Open a tour for step-by-step drop-off.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {a.tours.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tours yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">Tour results</caption>
                  <thead className="border-b border-border text-left text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="py-2 pr-3 font-medium">
                        Tour
                      </th>
                      <th scope="col" className="py-2 pr-3 font-medium">
                        Shown to
                      </th>
                      <th scope="col" className="py-2 pr-3 text-right font-medium">
                        Started
                      </th>
                      <th scope="col" className="py-2 pr-3 text-right font-medium">
                        Finished
                      </th>
                      <th scope="col" className="py-2 pr-3 text-right font-medium">
                        Skipped
                      </th>
                      <th scope="col" className="py-2 text-right font-medium">
                        Completion
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {a.tours.map((t) => (
                      <tr key={t.id}>
                        <td className="py-2.5 pr-3">
                          <Link
                            href={`${base}/tours/${t.id}/analytics?days=${days}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {t.name}
                          </Link>
                          <span className="ml-2 align-middle">
                            <TourStatusBadge status={t.status} />
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-muted-foreground">
                          {t.triggerType === "MANUAL"
                            ? "Link or button only"
                            : AUDIENCE_LABEL[t.audience]}
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{t.started}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{t.completed}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{t.skipped}</td>
                        <td className="py-2.5 text-right tabular-nums">
                          {t.started ? pct(t.completionRate) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {a.recentVisitors.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent visitors</CardTitle>
              <CardDescription>
                The 20 most recent. Waypoint never stores names, emails or user ids, so visitors are
                shown by a short code.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">Recent visitors</caption>
                  <thead className="border-b border-border text-left text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="py-2 pr-3 font-medium">
                        Visitor
                      </th>
                      <th scope="col" className="py-2 pr-3 font-medium">
                        Last seen
                      </th>
                      <th scope="col" className="py-2 pr-3 font-medium">
                        First seen
                      </th>
                      <th scope="col" className="py-2 pr-3 text-right font-medium">
                        Visits
                      </th>
                      <th scope="col" className="py-2 text-right font-medium">
                        Tours seen / finished
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {a.recentVisitors.map((v) => (
                      <tr key={v.label + v.lastSeenAt}>
                        <td className="py-2.5 pr-3">
                          <span className="font-mono text-xs">{v.label}</span>
                          <span
                            className={cn(
                              "ml-2 rounded-full px-2 py-0.5 text-xs",
                              v.identified
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {v.identified ? "Logged in" : "Anonymous"}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3">{ago(v.lastSeenAt)}</td>
                        <td className="py-2.5 pr-3 text-muted-foreground">
                          {formatDate(v.firstSeenAt)}
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{v.visits}</td>
                        <td className="py-2.5 text-right tabular-nums">
                          {v.toursSeen} / {v.toursFinished}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
