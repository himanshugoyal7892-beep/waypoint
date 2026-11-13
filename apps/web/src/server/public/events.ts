import "server-only";
import type { AnalyticsEventPayload } from "@waypoint/shared";
import { db } from "../db";
import { toEventRows, visitorStateDeltas } from "./event-rows";

/**
 * Stores a validated batch. Duplicate clientEventIds are ignored (idempotent retries and
 * sendBeacon + fetch double delivery). Start/complete/skip events that carry a visitor key also
 * update that visitor's tour history, used by the targeting rules.
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

  // Only events not already stored count towards history (retries must not double-count).
  const keyed = events.filter((e) => e.visitorKey && stepsByTour.has(e.tourId));
  let fresh = keyed;
  if (keyed.length) {
    const seen = await db.analyticsEvent.findMany({
      where: { projectId, clientEventId: { in: keyed.map((e) => e.clientEventId) } },
      select: { clientEventId: true },
    });
    const known = new Set(seen.map((s) => s.clientEventId));
    fresh = keyed.filter((e) => !known.has(e.clientEventId));
  }

  const result = rows.length
    ? await db.analyticsEvent.createMany({ data: rows, skipDuplicates: true })
    : { count: 0 };
  if (fresh.length) await applyVisitorState(projectId, fresh, now);
  return { accepted: result.count, dropped };
}

async function applyVisitorState(projectId: string, events: AnalyticsEventPayload[], now: Date) {
  const deltas = visitorStateDeltas(events, now);
  if (!deltas.length) return;
  // Keys are only accepted if this project issued them.
  const profiles = await db.visitorProfile.findMany({
    where: { projectId, visitorKey: { in: [...new Set(deltas.map((d) => d.visitorKey))] } },
    select: { visitorKey: true },
  });
  const valid = new Set(profiles.map((p) => p.visitorKey));
  for (const d of deltas) {
    if (!valid.has(d.visitorKey)) continue;
    const set = {
      ...(d.lastShownAt ? { lastShownAt: d.lastShownAt } : {}),
      ...(d.completedAt ? { completedAt: d.completedAt } : {}),
      ...(d.skippedAt ? { skippedAt: d.skippedAt } : {}),
    };
    await db.tourVisitorState.upsert({
      where: { tourId_visitorKey: { tourId: d.tourId, visitorKey: d.visitorKey } },
      create: { tourId: d.tourId, visitorKey: d.visitorKey, shows: d.showsIncrement, ...set },
      update: { shows: { increment: d.showsIncrement }, ...set },
    });
  }
}
