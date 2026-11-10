import { redirect } from "next/navigation";

// The step list lives on the tour page; keep /steps as a stable, linkable URL.
export default async function StepsIndex({
  params,
}: {
  params: Promise<{ projectId: string; tourId: string }>;
}) {
  const { projectId, tourId } = await params;
  redirect(`/dashboard/projects/${projectId}/tours/${tourId}#steps`);
}
