import { LIMITS, type AnalyticsEventPayload } from "@waypoint/shared";

/** Client timestamps more than ±24 h from the server clock are replaced by receive time. */
export function clampOccurredAt(clientMs: number, now: Date): Date {
  return Math.abs(clientMs - now.getTime()) > LIMITS.eventClockSkewMs ? now : new Date(clientMs);
}

/**
 * Turns a validated batch into rows. Drops events whose tour isn't in the project, or whose
 * stepId doesn't belong to that tour. Only whitelisted fields are copied.
 */
export function toEventRows(
  projectId: string,
  events: readonly AnalyticsEventPayload[],
  stepsByTour: ReadonlyMap<string, ReadonlySet<string>>,
  now: Date,
) {
  const rows = events.flatMap((e) => {
    const steps = stepsByTour.get(e.tourId);
    if (!steps) return [];
    if (e.stepId && !steps.has(e.stepId)) return [];
    return [
      {
        clientEventId: e.clientEventId,
        projectId,
        tourId: e.tourId,
        tourVersion: e.tourVersion,
        stepId: e.stepId ?? null,
        stepOrder: e.stepOrder ?? null,
        anonymousVisitorId: e.anonymousVisitorId,
        sessionId: e.sessionId,
        eventName: e.eventName,
        currentUrl: e.currentUrl,
        occurredAt: clampOccurredAt(e.timestamp, now),
        errorCode: e.errorCode ?? null,
      },
    ];
  });
  return { rows, dropped: events.length - rows.length };
}

export interface VisitorStateDelta {
  tourId: string;
  visitorKey: string;
  showsIncrement: number;
  lastShownAt: Date | null;
  completedAt: Date | null;
  skippedAt: Date | null;
}

/**
 * Folds newly received start/complete/skip events into one change per (tour, visitor) so the
 * server can apply targeting rules ("shown 2 of 3 times", "finished") on later visits.
 */
export function visitorStateDeltas(
  events: readonly AnalyticsEventPayload[],
  now: Date,
): VisitorStateDelta[] {
  const out = new Map<string, VisitorStateDelta>();
  for (const e of events) {
    if (!e.visitorKey) continue;
    if (!["tour_started", "tour_completed", "tour_skipped"].includes(e.eventName)) continue;
    const id = `${e.tourId}\n${e.visitorKey}`;
    const d = out.get(id) ?? {
      tourId: e.tourId,
      visitorKey: e.visitorKey,
      showsIncrement: 0,
      lastShownAt: null,
      completedAt: null,
      skippedAt: null,
    };
    const at = clampOccurredAt(e.timestamp, now);
    const later = (a: Date | null) => (!a || at > a ? at : a);
    if (e.eventName === "tour_started") {
      d.showsIncrement++;
      d.lastShownAt = later(d.lastShownAt);
    } else if (e.eventName === "tour_completed") d.completedAt = later(d.completedAt);
    else d.skippedAt = later(d.skippedAt);
    out.set(id, d);
  }
  return [...out.values()];
}
