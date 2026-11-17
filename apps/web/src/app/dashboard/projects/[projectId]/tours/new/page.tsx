import type { Metadata } from "next";
import { NewTourChooser } from "@/components/ai/ai-draft-start";
import { PageHeader } from "@/components/layout";
import { loadOr404 } from "@/lib/page-data";
import { siteOrigin } from "@/lib/tip";
import { requirePageUser } from "@/server/auth";
import { getProject } from "@/server/services/projects";

export const metadata: Metadata = { title: "New tour" };

export default async function NewTourPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const user = await requirePageUser();
  const project = await loadOr404(() => getProject(user.id, projectId));
  return (
    <div>
      <PageHeader
        title="New tour"
        description="Let AI draft it from a page on your site, or build it yourself."
        breadcrumbs={[{ href: `/dashboard/projects/${projectId}/tours`, label: "Tours" }]}
      />
      <NewTourChooser projectId={projectId} siteOrigin={siteOrigin(project.allowedOrigins)} />
    </div>
  );
}
