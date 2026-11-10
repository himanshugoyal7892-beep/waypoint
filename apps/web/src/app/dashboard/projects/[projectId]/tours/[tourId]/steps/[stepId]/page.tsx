import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DeleteStepButton } from "@/components/delete-buttons";
import { StepForm } from "@/components/forms/step-form";
import { PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { loadOr404 } from "@/lib/page-data";
import { formatDate } from "@/lib/utils";
import { requirePageUser } from "@/server/auth";
import { getTour } from "@/server/services/tours";

export const metadata: Metadata = { title: "Edit step" };

export default async function EditStepPage({
  params,
}: {
  params: Promise<{ projectId: string; tourId: string; stepId: string }>;
}) {
  const { projectId, tourId, stepId } = await params;
  const user = await requirePageUser();
  const tour = await loadOr404(() => getTour(user.id, tourId));
  const step = tour.steps.find((s) => s.id === stepId);
  if (tour.projectId !== projectId || !step) notFound();
  const tourHref = `/dashboard/projects/${projectId}/tours/${tourId}`;
  const label = step.title || step.description.slice(0, 40) || `Step ${step.stepOrder}`;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={`Edit step ${step.stepOrder}`}
        description={`Last updated ${formatDate(step.updatedAt)}`}
        breadcrumbs={[
          { href: `/dashboard/projects/${projectId}/tours`, label: "Tours" },
          { href: tourHref, label: tour.name },
        ]}
        actions={<DeleteStepButton stepId={step.id} label={label} afterHref={tourHref} />}
      />
      <Card>
        <CardContent className="pt-5">
          <StepForm
            mode="edit"
            tourId={tourId}
            stepId={step.id}
            backHref={tourHref}
            maxOrder={tour.steps.length}
            initial={{
              stepOrder: step.stepOrder,
              pageUrl: step.pageUrl,
              cssSelector: step.cssSelector,
              title: step.title,
              description: step.description,
              placement: step.placement,
              nextButtonLabel: step.nextButtonLabel,
              backButtonLabel: step.backButtonLabel,
              allowSkip: step.allowSkip,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
