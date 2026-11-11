import { loadOr404 } from "@/lib/page-data";
import { requirePageUser } from "@/server/auth";
import { ownProject } from "@/server/ownership";

// Section navigation for a project lives in the sidebar (Overview / Install / Tours).
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
  return <>{children}</>;
}
