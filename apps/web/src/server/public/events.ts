import "server-only";
import type { AnalyticsEventPayload } from "@waypoint/shared";
import { db } from "../db";
import { toEventRows } from "./event-rows";

/**
 * Stores a validated batch. Duplicate clientEventIds are ignored (idempotent retries and
 * sendBeacon + fetch double delivery).
 */
export async function ingestEvents(
  projectId: string,
  events: AnalyticsEventPayload[],
  now = new Date(),
) {
  const tourIds = [...new Set(events.map((e) => e.tourId))];
  const tours = await db.tour.findMany({
    where: { projectId, id: { in: tourIds } },
    select: { id: true, steps: { select: { id: true } } },
  });
  const stepsByTour = new Map(tours.map((t) => [t.id, new Set(t.steps.map((s) => s.id))]));
  const { rows, dropped } = toEventRows(projectId, events, stepsByTour, now);
  const result = rows.length
    ? await db.analyticsEvent.createMany({ data: rows, skipDuplicates: true })
    : { count: 0 };
  return { accepted: result.count, dropped };
}
