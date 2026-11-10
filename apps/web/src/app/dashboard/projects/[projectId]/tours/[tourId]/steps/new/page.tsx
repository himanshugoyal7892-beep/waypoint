import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StepForm } from "@/components/forms/step-form";
import { PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { loadOr404 } from "@/lib/page-data";
import { requirePageUser } from "@/server/auth";
import { getTour } from "@/server/services/tours";

export const metadata: Metadata = { title: "Add step" };

export default async function NewStepPage({
  params,
}: {
  params: Promise<{ projectId: string; tourId: string }>;
}) {
  const { projectId, tourId } = await params;
  const user = await requirePageUser();
  const tour = await loadOr404(() => getTour(user.id, tourId));
  if (tour.projectId !== projectId) notFound();
  const tourHref = `/dashboard/projects/${projectId}/tours/${tourId}`;
  const last = tour.steps.at(-1);
  const nextOrder = tour.steps.length + 1;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={`Add step ${nextOrder}`}
        description={`To “${tour.name}”`}
        breadcrumbs={[
          { href: `/dashboard/projects/${projectId}/tours`, label: "Tours" },
          { href: tourHref, label: tour.name },
        ]}
      />
      <Card>
        <CardContent className="pt-5">
          <StepForm
            mode="create"
            tourId={tourId}
            backHref={tourHref}
            maxOrder={nextOrder}
            initial={{
              stepOrder: nextOrder,
              // New steps usually continue on the same page as the previous one.
              pageUrl: last?.pageUrl ?? (tour.startUrl.includes("*") ? "/" : tour.startUrl),
              cssSelector: "",
              title: "",
              description: "",
              placement: "AUTO",
              nextButtonLabel: "Next",
              backButtonLabel: "Back",
              allowSkip: true,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
