import { ArrowRight, CalendarDays, CheckCircle2, Plus, Rocket } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { HealthBadge, ProgressRing } from "@/components/insights";
import { EmptyState, PageHeader, StatCard } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageUser } from "@/server/auth";
import { getHomeInsights } from "@/server/insights/service";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardHome() {
  const user = await requirePageUser();
  const projects = await getHomeInsights(user.id);
  const firstName = user.name?.split(" ")[0];
  const total = (k: "visits7d" | "completions7d" | "starts7d" | "liveTours") =>
    projects.reduce((n, p) => n + p.kpis[k], 0);
  const attention = projects
    .flatMap((p) => p.tours.map((t) => ({ ...t, projectId: p.id, projectName: p.name })))
    .filter((t) => t.status === "PUBLISHED" && t.health.grade !== "A")
    .sort((a, b) => a.health.score - b.health.score)
    .slice(0, 5);
  const starts = total("starts7d");

  return (
    <>
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Welcome"}
        description="How your tours are doing this week, and what to do next."
        actions={
          <Button asChild>
            <Link href="/dashboard/projects/new">
              <Plus aria-hidden /> New project
            </Link>
          </Button>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          variant="project"
          title="Start with your website"
          description="A project holds the tours for one website. Create one to get your install snippet and launch checklist."
          action={
            <Button asChild>
              <Link href="/dashboard/projects/new">Create your first project</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Visits"
              value={total("visits7d")}
              hint="Last 7 days, all projects"
              icon={<CalendarDays />}
            />
            <StatCard
              label="Tours completed"
              value={total("completions7d")}
              hint={
                starts
                  ? `${Math.round((total("completions7d") / starts) * 100)}% of ${starts} starts`
                  : "Last 7 days"
              }
              icon={<CheckCircle2 />}
              tone="green"
            />
            <StatCard
              label="Live tours"
              value={total("liveTours")}
              hint={`Across ${projects.length} project${projects.length === 1 ? "" : "s"}`}
              icon={<Rocket />}
              tone="amber"
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <section aria-labelledby="projects-heading">
              <div className="mb-3 flex items-center justify-between">
                <h2 id="projects-heading" className="text-base font-semibold">
                  Projects
                </h2>
                <Link href="/dashboard/projects" className="text-sm text-primary hover:underline">
                  See all
                </Link>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2">
                {projects.slice(0, 6).map((p) => {
                  const scored = p.tours.filter((t) => t.status === "PUBLISHED");
                  const avg = scored.length
                    ? Math.round(scored.reduce((n, t) => n + t.health.score, 0) / scored.length)
                    : null;
                  return (
                    <li key={p.id}>
                      <Link
                        href={`/dashboard/projects/${p.id}`}
                        className="flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-card hover:border-primary/40 focus-visible:outline-2"
                      >
                        <div className="flex items-start gap-3">
                          <ProgressRing
                            value={p.checklist.progress}
                            size={64}
                            stroke={6}
                            label={`${p.checklist.done}/${p.checklist.total}`}
                          />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{p.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {p.domain}
                            </span>
                            <span className="mt-1 block text-sm font-medium text-primary">
                              {p.checklist.level.name}
                            </span>
                          </span>
                        </div>
                        <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
                          <div>
                            <dt className="text-[11px] text-muted-foreground">Visits 7d</dt>
                            <dd className="font-display text-lg font-semibold tabular-nums">
                              {p.kpis.visits7d}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[11px] text-muted-foreground">Live tours</dt>
                            <dd className="font-display text-lg font-semibold tabular-nums">
                              {p.kpis.liveTours}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[11px] text-muted-foreground">Avg health</dt>
                            <dd className="font-display text-lg font-semibold tabular-nums">
                              {avg ?? "—"}
                            </dd>
                          </div>
                        </dl>
                        {p.checklist.next && (
                          <span className="mt-3 flex items-center gap-1.5 rounded-lg bg-warning-soft px-2.5 py-1.5 text-xs font-medium text-warning">
                            Next: {p.checklist.next.label}
                            <ArrowRight className="ml-auto size-3.5" aria-hidden />
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>

            <Card>
              <CardHeader>
                <CardTitle>Needs attention</CardTitle>
                <CardDescription>Live tours with the most room to improve.</CardDescription>
              </CardHeader>
              <CardContent>
                {attention.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Every live tour scores an A. Nothing to fix right now.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {attention.map((t) => (
                      <li key={t.id}>
                        <Link
                          href={`/dashboard/projects/${t.projectId}/tours/${t.id}`}
                          className="-mx-2 flex gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/50"
                        >
                          <HealthBadge health={t.health} size="sm" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{t.name}</span>
                            <span className="block text-xs text-muted-foreground">
                              {t.health.tips[0] ?? t.projectName}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
