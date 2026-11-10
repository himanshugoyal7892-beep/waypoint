import { CheckCircle2, Circle, FolderKanban, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { requirePageUser } from "@/server/auth";
import { listProjects } from "@/server/services/projects";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardHome() {
  const user = await requirePageUser();
  const projects = await listProjects(user.id);
  const tourCount = projects.reduce((n, p) => n + p._count.tours, 0);
  const publishedCount = projects.reduce((n, p) => n + p.tours.length, 0);
  const firstName = user.name?.split(" ")[0];

  const checklist = [
    { done: projects.length > 0, label: "Create a project" },
    { done: projects.some((p) => p.allowedOrigins.length > 0), label: "Add your site's origin" },
    { done: tourCount > 0, label: "Create a tour with steps" },
    { done: publishedCount > 0, label: "Publish a tour" },
  ];

  return (
    <>
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Welcome"}
        description="Create guided tours for your website and publish them without code changes."
        actions={
          <Button asChild>
            <Link href="/dashboard/projects/new">
              <Plus aria-hidden /> New project
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Projects", value: projects.length },
          { label: "Tours", value: tourCount },
          { label: "Published tours", value: publishedCount },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader>
              <CardDescription>{s.label}</CardDescription>
              <p className="text-3xl font-semibold tabular-nums">{s.value}</p>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent projects</CardTitle>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <EmptyState
                icon={<FolderKanban />}
                title="No projects yet"
                description="A project represents one website. Create one to get your install snippet."
                action={
                  <Button asChild>
                    <Link href="/dashboard/projects/new">Create your first project</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {projects.slice(0, 5).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-4 py-3">
                    <div>
                      <Link
                        href={`/dashboard/projects/${p.id}`}
                        className="font-medium hover:underline"
                      >
                        {p.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {p.domain} · {p._count.tours} tour{p._count.tours === 1 ? "" : "s"}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Updated {formatDate(p.updatedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Getting started</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm">
              {checklist.map((c) => (
                <li key={c.label} className="flex items-center gap-2">
                  {c.done ? (
                    <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />
                  ) : (
                    <Circle className="size-4 text-muted-foreground" aria-hidden />
                  )}
                  <span className={c.done ? "text-muted-foreground line-through" : ""}>
                    {c.label}
                  </span>
                  <span className="sr-only">{c.done ? "(done)" : "(to do)"}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
