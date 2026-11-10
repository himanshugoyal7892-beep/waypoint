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
