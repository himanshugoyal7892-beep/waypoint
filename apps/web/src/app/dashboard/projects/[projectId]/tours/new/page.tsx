import type { Metadata } from "next";
import { TourForm } from "@/components/forms/tour-form";
import { PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "New tour" };

export default async function NewTourPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return (
    <div className="max-w-2xl">
      <PageHeader
        title="New tour"
        description="Name the tour and choose where it starts. You'll add steps next."
        breadcrumbs={[{ href: `/dashboard/projects/${projectId}/tours`, label: "Tours" }]}
      />
      <Card>
        <CardContent className="pt-5">
          <TourForm mode="create" projectId={projectId} />
        </CardContent>
      </Card>
    </div>
  );
}
