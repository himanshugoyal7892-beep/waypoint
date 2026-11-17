import "server-only";
import type { AiDraftInput, AiWordingInput } from "@waypoint/shared";
import { db } from "../db";
import { computeTourHealth } from "../insights/health";
import { ownTour } from "../ownership";
import { runTool } from "./claude";
import { draftTour, reviewTour, rewordStep } from "./tasks";

export const aiReword = (input: AiWordingInput) => rewordStep(input, runTool);
export const aiDraft = (input: AiDraftInput) => draftTour(input, runTool);

/** Reviews a tour with its last 30 days of step views: explains the biggest drop-off. */
export async function aiReview(userId: string, tourId: string) {
  await ownTour(userId, tourId);
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [tour, rows] = await Promise.all([
    db.tour.findUniqueOrThrow({
      where: { id: tourId },
      select: {
        name: true,
        status: true,
        steps: {
          orderBy: { stepOrder: "asc" },
          select: { id: true, stepOrder: true, title: true, description: true, pageUrl: true },
        },
      },
    }),
    db.analyticsEvent.groupBy({
      by: ["eventName", "stepOrder"],
      where: {
        tourId,
        occurredAt: { gte: since },
        eventName: { in: ["tour_started", "tour_completed", "step_viewed"] },
      },
      _count: { _all: true },
    }),
  ]);
  const count = (e: string) =>
    rows.filter((r) => r.eventName === e).reduce((n, r) => n + r._count._all, 0);
  const viewedByStep = Object.fromEntries(
    rows
      .filter((r) => r.eventName === "step_viewed" && r.stepOrder !== null)
      .map((r) => [r.stepOrder!, r._count._all]),
  );
  const started = count("tour_started");
  const completed = count("tour_completed");
  const { dropOff } = computeTourHealth({
    status: tour.status,
    aimed: true,
    steps: tour.steps,
    started,
    completed,
    viewedByStep,
    missingByStep: {},
  });
  return reviewTour(
    { tourName: tour.name, steps: tour.steps, started, completed, viewedByStep, dropOff },
    runTool,
  );
}
