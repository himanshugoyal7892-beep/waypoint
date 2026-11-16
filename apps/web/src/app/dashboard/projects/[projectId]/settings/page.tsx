import type { Metadata } from "next";
import { DeleteProjectButton } from "@/components/delete-buttons";
import { ProjectForm } from "@/components/forms/project-form";
import { PageHeader } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadOr404 } from "@/lib/page-data";
import { formatDate } from "@/lib/utils";
import { requirePageUser } from "@/server/auth";
import { getProject } from "@/server/services/projects";

export const metadata: Metadata = { title: "Project settings" };

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await requirePageUser();
  const project = await loadOr404(() => getProject(user.id, projectId));
  const base = `/dashboard/projects/${project.id}`;

  return (
    <>
      <PageHeader
        title="Settings"
        description={`Created ${formatDate(project.createdAt)} · Updated ${formatDate(project.updatedAt)}`}
        breadcrumbs={[
          { href: base, label: project.name },
          { href: `${base}/settings`, label: "Settings" },
        ]}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Project</CardTitle>
            <CardDescription>
              Website, who may load tours, how logged-in users are recognised, and how tours look.
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
                identitySource: project.identitySource,
                identityKey: project.identityKey,
                maxAutoToursPerVisit: project.maxAutoToursPerVisit,
                themeColor: project.themeColor,
                tipStyle: project.tipStyle,
                tipCorners: project.tipCorners,
                tipProgress: project.tipProgress,
                tipFont: project.tipFont,
                tipBackdrop: project.tipBackdrop,
              }}
            />
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>On this page</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {[
                  ["#name", "Name and website"],
                  ["#allowedOrigins", "Allowed websites"],
                  ["#identity", "Recognise logged-in users"],
                  ["#display", "Tour display and brand colour"],
                ].map(([href, label]) => (
                  <li key={href}>
                    <a href={href} className="text-primary hover:underline">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <section
            aria-labelledby="danger"
            className="rounded-xl border border-destructive/30 bg-card p-5"
          >
            <h2 id="danger" className="text-sm font-semibold">
              Danger zone
            </h2>
            <p className="mb-3 mt-1 text-sm text-muted-foreground">
              Deleting a project removes all of its tours, steps and analytics.
            </p>
            <DeleteProjectButton projectId={project.id} name={project.name} />
          </section>
        </div>
      </div>
    </>
  );
}
