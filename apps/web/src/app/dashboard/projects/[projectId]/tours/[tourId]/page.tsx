import { ListOrdered, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteTourButton } from "@/components/delete-buttons";
import { TourForm } from "@/components/forms/tour-form";
import { EmptyState, PageHeader } from "@/components/layout";
import { BuilderPassCard } from "@/components/tours/builder-pass-card";
import { StepList } from "@/components/tours/step-list";
import { TourStatusControls } from "@/components/tours/tour-status-controls";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadOr404 } from "@/lib/page-data";
import { requirePageUser } from "@/server/auth";
import { checkPublishable, getTour } from "@/server/services/tours";

export const metadata: Metadata = { title: "Edit tour" };

export default async function TourPage({
  params,
}: {
  params: Promise<{ projectId: string; tourId: string }>;
}) {
  const { projectId, tourId } = await params;
  const user = await requirePageUser();
  const [tour, issues] = await loadOr404(() =>
    Promise.all([getTour(user.id, tourId), checkPublishable(user.id, tourId)]),
  );
  // A valid tour id under the wrong project URL is treated as not found.
  if (tour.projectId !== projectId) notFound();

  const projectHref = `/dashboard/projects/${projectId}`;
  const base = `${projectHref}/tours/${tour.id}`;
  const firstOrigin = tour.project.allowedOrigins[0] ?? "http://localhost:5173";
  const startPath = tour.startUrl.includes("*") ? "/" : tour.startUrl;

  return (
    <>
      <PageHeader
        title={tour.name}
        breadcrumbs={[{ href: `${projectHref}/tours`, label: "Tours" }]}
        actions={
          <DeleteTourButton tourId={tour.id} name={tour.name} afterHref={`${projectHref}/tours`} />
        }
      />

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          <Card id="steps">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Steps ({tour.steps.length})</CardTitle>
              <Button size="sm" asChild>
                <Link href={`${base}/steps/new`}>
                  <Plus aria-hidden /> Add step
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {tour.steps.length === 0 ? (
                <EmptyState
                  icon={<ListOrdered />}
                  title="No steps yet"
                  description="Each step points at an element on a page and shows a tooltip next to it."
                  action={
                    <Button asChild>
                      <Link href={`${base}/steps/new`}>Add the first step</Link>
                    </Button>
                  }
                />
              ) : (
                <StepList tourId={tour.id} steps={tour.steps} baseHref={base} />
              )}
            </CardContent>
          </Card>
          <BuilderPassCard
            projectId={projectId}
            tourId={tour.id}
            defaultUrl={`${firstOrigin}${startPath}`}
          />
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="pt-5">
              <TourStatusControls
                tourId={tour.id}
                status={tour.status}
                publishedAt={tour.publishedAt?.toISOString() ?? null}
                initialIssues={issues}
                tourHref={base}
                projectHref={projectHref}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <TourForm
                mode="edit"
                projectId={projectId}
                tourId={tour.id}
                initial={{
                  name: tour.name,
                  description: tour.description ?? "",
                  startUrl: tour.startUrl,
                  triggerType: tour.triggerType,
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
