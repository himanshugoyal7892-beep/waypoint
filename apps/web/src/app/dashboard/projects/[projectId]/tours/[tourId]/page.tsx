import { BarChart3, Link2, ListOrdered, Plus, Users } from "lucide-react";
import { HealthBadge, HealthPanel } from "@/components/insights";
import { getProjectInsights } from "@/server/insights/service";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteTourButton } from "@/components/delete-buttons";
import { CopyButton } from "@/components/common";
import { TourForm } from "@/components/forms/tour-form";
import { TourTargetingForm } from "@/components/forms/tour-targeting-form";
import { EmptyState, PageHeader, TabNav } from "@/components/layout";
import { BuilderPassCard } from "@/components/tours/builder-pass-card";
import { StepList } from "@/components/tours/step-list";
import { TourStatusControls } from "@/components/tours/tour-status-controls";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadOr404 } from "@/lib/page-data";
import { siteOrigin, tipOf } from "@/lib/tip";
import { TourPlayer } from "@/components/tip-preview";
import { PRODUCT } from "@waypoint/shared/product-config";
import { requirePageUser } from "@/server/auth";
import { checkPublishable, getTour } from "@/server/services/tours";

export const metadata: Metadata = { title: "Edit tour" };

const TABS = [
  { key: "steps", label: "Steps" },
  { key: "who", label: "Who & when" },
  { key: "details", label: "Details & link" },
] as const;

export default async function TourPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; tourId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ projectId, tourId }, sp] = await Promise.all([params, searchParams]);
  const tab = TABS.find((t) => t.key === sp.tab)?.key ?? "steps";
  const user = await requirePageUser();
  const [tour, issues, insights] = await loadOr404(() =>
    Promise.all([
      getTour(user.id, tourId),
      checkPublishable(user.id, tourId),
      getProjectInsights(user.id, projectId),
    ]),
  );
  const health = insights.tours.find((t) => t.id === tourId)?.health ?? null;
  // A valid tour id under the wrong project URL is treated as not found.
  if (tour.projectId !== projectId) notFound();

  const projectHref = `/dashboard/projects/${projectId}`;
  const base = `${projectHref}/tours/${tour.id}`;
  // Prefer a real website over local development origins for the builder.
  const origins = tour.project.allowedOrigins;
  const firstOrigin = siteOrigin(origins);
  const startPath = tour.startUrl.includes("*") ? "/" : tour.startUrl;
  const linkPage = tour.steps[0]?.pageUrl ?? startPath;
  const shareLink = `${firstOrigin}${linkPage}?${PRODUCT.sdk.startQueryParam}=${encodeURIComponent(tour.id)}`;
  const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

  return (
    <>
      <PageHeader
        title={tour.name}
        breadcrumbs={[{ href: `${projectHref}/tours`, label: "Tours" }]}
        actions={
          <>
            {health && (
              <a href="#health" aria-label="Tour health">
                <HealthBadge health={health} />
              </a>
            )}
            <Button variant="outline" asChild>
              <Link href={`${base}/analytics`}>
                <BarChart3 aria-hidden /> Analytics
              </Link>
            </Button>
            <DeleteTourButton
              tourId={tour.id}
              name={tour.name}
              afterHref={`${projectHref}/tours`}
            />
          </>
        }
      />

      <TabNav
        label="Tour sections"
        current={tab}
        tabs={[
          {
            key: "steps",
            label: "Steps",
            href: base,
            icon: <ListOrdered aria-hidden />,
            count: tour.steps.length,
          },
          { key: "who", label: "Who & when", href: `${base}?tab=who`, icon: <Users aria-hidden /> },
          {
            key: "details",
            label: "Details & link",
            href: `${base}?tab=details`,
            icon: <Link2 aria-hidden />,
          },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-6">
          {tab === "steps" && (
            <>
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
                      variant="step"
                      className="border-none bg-transparent py-6"
                      title="No steps yet"
                      description="Each step points at an element on your website. Add one here, or click elements directly with the visual builder below."
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
                projectKey={tour.project.publicKey}
                tourId={tour.id}
                defaultUrl={`${firstOrigin}${startPath}`}
              />
            </>
          )}
          {tab === "who" && (
            <>
              <Card id="targeting">
                <CardHeader>
                  <CardTitle>Who sees it and when</CardTitle>
                  <CardDescription>Rules for automatic tours.</CardDescription>
                </CardHeader>
                <CardContent>
                  <TourTargetingForm
                    tourId={tour.id}
                    manual={tour.triggerType === "MANUAL"}
                    identityConfigured={tour.project.identitySource !== "NONE"}
                    projectHref={projectHref}
                    initial={{
                      audience: tour.audience,
                      audienceDays: tour.audienceDays?.toString() ?? "",
                      audienceBefore: day(tour.audienceBefore),
                      frequency: tour.frequency,
                      maxShows: tour.maxShows?.toString() ?? "",
                      intervalDays: tour.intervalDays?.toString() ?? "",
                      startsAt: day(tour.startsAt),
                      endsAt: day(tour.endsAt),
                      loginState: tour.loginState,
                      device: tour.device,
                      priority: String(tour.priority),
                      waitSeconds: String(tour.waitSeconds),
                    }}
                  />
                </CardContent>
              </Card>
            </>
          )}
          {tab === "details" && (
            <>
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
              <Card id="share-link">
                <CardHeader>
                  <CardTitle>Start from a link</CardTitle>
                  <CardDescription>
                    Opens the page with this tour running, for anyone, whatever the rules above. Use
                    it in emails, help articles or support replies.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <code className="block break-all rounded-md bg-muted px-3 py-2 text-xs">
                    {shareLink}
                  </code>
                  <div className="flex items-center gap-3">
                    <CopyButton value={shareLink} label="Copy link" />
                    {tour.status !== "PUBLISHED" && (
                      <span className="text-xs text-muted-foreground">
                        Works once the tour is published.
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
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
          {tour.steps.length > 0 && (
            <Card id="preview">
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                <CardDescription>
                  Click through the tour the way visitors see it, on a desktop or phone screen.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TourPlayer
                  steps={tour.steps}
                  tip={tipOf(tour.project)}
                  brand={tour.project.themeColor}
                  origin={firstOrigin}
                />
              </CardContent>
            </Card>
          )}
          {health && (
            <Card id="health">
              <CardHeader>
                <CardTitle>Tour health</CardTitle>
                <CardDescription>Raise the score to get more visitors to the end.</CardDescription>
              </CardHeader>
              <CardContent>
                <HealthPanel health={health} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
