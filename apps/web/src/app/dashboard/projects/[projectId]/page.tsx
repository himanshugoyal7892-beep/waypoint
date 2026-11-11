import { KeyRound, Map as MapIcon, Plus, Rocket } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DeleteProjectButton } from "@/components/delete-buttons";
import { ProjectForm } from "@/components/forms/project-form";
import { PageHeader, StatCard, TourStatusBadge } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/misc";
import { loadOr404 } from "@/lib/page-data";
import { formatDate } from "@/lib/utils";
import { requirePageUser } from "@/server/auth";
import { getProject } from "@/server/services/projects";

export const metadata: Metadata = { title: "Project overview" };

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await requirePageUser();
  const project = await loadOr404(() => getProject(user.id, projectId));
  const base = `/dashboard/projects/${project.id}`;
  const published = project.tours.filter((t) => t.status === "PUBLISHED").length;

  return (
    <>
      <PageHeader
        title={project.name}
        description={project.domain}
        breadcrumbs={[{ href: "/dashboard/projects", label: "Projects" }]}
        actions={
          <Button asChild>
            <Link href={`${base}/tours/new`}>
              <Plus aria-hidden /> New tour
            </Link>
          </Button>
        }
      />
      {project.allowedOrigins.length === 0 && (
        <Alert tone="warning" title="No allowed origins" className="mb-6">
          Tours can&apos;t load and can&apos;t be published until you add at least one allowed
          origin below.
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Tours" value={project.tours.length} icon={<MapIcon />} tone="amber" />
        <StatCard
          label="Live"
          value={published}
          icon={<Rocket />}
          tone="green"
          hint="Published tours"
        />
        <StatCard
          label="Public key"
          value={
            <span className="block truncate font-mono text-base font-medium">
              {project.publicKey}
            </span>
          }
          icon={<KeyRound />}
          hint={
            <Link href={`${base}/install`} className="text-primary hover:underline">
              View install snippet
            </Link>
          }
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent tours</CardTitle>
          </CardHeader>
          <CardContent>
            {project.tours.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tours yet.{" "}
                <Link href={`${base}/tours/new`} className="text-primary hover:underline">
                  Create one
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {project.tours.slice(0, 6).map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                    <Link
                      href={`${base}/tours/${t.id}`}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {t.name}
                    </Link>
                    <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                      {t._count.steps} steps <TourStatusBadge status={t.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>
              Created {formatDate(project.createdAt)} · Updated {formatDate(project.updatedAt)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectForm
              mode="edit"
              projectId={project.id}
              initial={{
                name: project.name,
                domain: project.domain,
                allowedOrigins: project.allowedOrigins,
              }}
            />
          </CardContent>
        </Card>
      </div>

      <section
        aria-labelledby="danger"
        className="mt-8 rounded-lg border border-destructive/30 bg-background p-5"
      >
        <h2 id="danger" className="text-sm font-semibold">
          Danger zone
        </h2>
        <p className="mb-3 mt-1 text-sm text-muted-foreground">
          Deleting a project removes all of its tours, steps and analytics.
        </p>
        <DeleteProjectButton projectId={project.id} name={project.name} />
      </section>
    </>
  );
}
