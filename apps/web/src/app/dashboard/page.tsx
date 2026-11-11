import { FolderKanban, Map as MapIcon, Plus, Rocket } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader, StatCard } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatDate } from "@/lib/utils";
import { requirePageUser } from "@/server/auth";
import { listProjects } from "@/server/services/projects";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardHome() {
  const user = await requirePageUser();
  const projects = await listProjects(user.id);
  const tourCount = projects.reduce((n, p) => n + p._count.tours, 0);
  const publishedCount = projects.reduce((n, p) => n + p.tours.length, 0);
  const firstName = user.name?.split(" ")[0];
  const firstProject = projects[0];

  const route = [
    { done: projects.length > 0, label: "Create a project", href: "/dashboard/projects/new" },
    {
      done: projects.some((p) => p.allowedOrigins.length > 0),
      label: "Add your website's address",
      href: firstProject ? `/dashboard/projects/${firstProject.id}` : "/dashboard/projects/new",
    },
    {
      done: tourCount > 0,
      label: "Build a tour",
      href: firstProject
        ? `/dashboard/projects/${firstProject.id}/tours`
        : "/dashboard/projects/new",
    },
    {
      done: publishedCount > 0,
      label: "Publish it",
      href: firstProject
        ? `/dashboard/projects/${firstProject.id}/tours`
        : "/dashboard/projects/new",
    },
  ];
  const nextIndex = route.findIndex((r) => !r.done);

  return (
    <>
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Welcome"}
        description="Build guided tours for your website and publish them without a code release."
        actions={
          <Button asChild>
            <Link href="/dashboard/projects/new">
              <Plus aria-hidden /> New project
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Projects"
          value={projects.length}
          icon={<FolderKanban />}
          hint="One per website"
        />
        <StatCard
          label="Tours"
          value={tourCount}
          icon={<MapIcon />}
          tone="amber"
          hint={`${tourCount - publishedCount} in draft`}
        />
        <StatCard
          label="Live tours"
          value={publishedCount}
          icon={<Rocket />}
          tone="green"
          hint="Published and visible to visitors"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent projects</CardTitle>
            {projects.length > 0 && (
              <Link href="/dashboard/projects" className="text-sm text-primary hover:underline">
                See all
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <EmptyState
                className="border-none bg-transparent py-6"
                title="Start with your website"
                description="A project holds the tours for one website. Create one to get your install snippet."
                action={
                  <Button asChild>
                    <Link href="/dashboard/projects/new">Create your first project</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="-mx-2">
                {projects.slice(0, 5).map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/dashboard/projects/${p.id}`}
                      className="flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-muted/60 focus-visible:outline-2"
                    >
                      <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft font-display font-semibold text-primary"
                        aria-hidden
                      >
                        {p.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{p.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {p.domain} · {p._count.tours} tour{p._count.tours === 1 ? "" : "s"},{" "}
                          {p.tours.length} live
                        </span>
                      </span>
                      <span className="hidden text-xs text-muted-foreground sm:block">
                        Updated {formatDate(p.updatedAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your route to a live tour</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative ml-1.5">
              {route.map((r, i) => {
                const isNext = i === nextIndex;
                return (
                  <li key={r.label} className="relative flex gap-3 pb-5 last:pb-0">
                    {i < route.length - 1 && (
                      <span
                        aria-hidden
                        className={cn(
                          "absolute top-5 left-[7px] h-[calc(100%-12px)] border-l-2",
                          r.done ? "border-primary" : "border-dashed border-[#c9cceb]",
                        )}
                      />
                    )}
                    {isNext ? (
                      <svg
                        viewBox="0 0 12 16"
                        className="relative z-10 mt-0.5 h-5 w-4 shrink-0"
                        aria-hidden
                      >
                        <path
                          d="M6 0a6 6 0 0 0-6 6c0 4.2 6 10 6 10s6-5.8 6-10a6 6 0 0 0-6-6Z"
                          fill="#F5A524"
                        />
                        <circle cx="6" cy="6" r="2.2" fill="#1B1F4B" />
                      </svg>
                    ) : (
                      <span
                        aria-hidden
                        className={cn(
                          "relative z-10 mt-1 size-4 shrink-0 rounded-full border-2",
                          r.done ? "border-primary bg-primary" : "border-[#c9cceb] bg-white",
                        )}
                      />
                    )}
                    <div className="min-w-0">
                      {isNext ? (
                        <Link href={r.href} className="font-medium text-foreground hover:underline">
                          {r.label}
                        </Link>
                      ) : (
                        <span
                          className={cn(
                            "text-sm",
                            r.done ? "text-muted-foreground" : "text-foreground",
                          )}
                        >
                          {r.label}
                        </span>
                      )}
                      <span className="sr-only">
                        {r.done ? " (done)" : isNext ? " (next)" : " (to do)"}
                      </span>
                      {isNext && <p className="text-xs text-muted-foreground">Next stop</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
            {nextIndex === -1 && (
              <p className="mt-4 text-sm text-muted-foreground">All done. Your tour is live.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
