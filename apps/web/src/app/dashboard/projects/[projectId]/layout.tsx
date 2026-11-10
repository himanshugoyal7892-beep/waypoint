import { ProjectNav } from "@/components/project-nav";
import { loadOr404 } from "@/lib/page-data";
import { requirePageUser } from "@/server/auth";
import { ownProject } from "@/server/ownership";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await requirePageUser();
  await loadOr404(() => ownProject(user.id, projectId));
  return (
    <>
      <ProjectNav projectId={projectId} />
      {children}
    </>
  );
}
