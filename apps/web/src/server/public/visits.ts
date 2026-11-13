import "server-only";
import {
  isTourEligible,
  nextVisit,
  type TourHistory,
  type VisitRequest,
  type VisitResponse,
  type VisitorFacts,
} from "@waypoint/shared";
import { visitorKeyFor } from "../crypto";
import { db } from "../db";

/**
 * Records a visit and returns which automatic tours this visitor may see now. The visitor's
 * profile (first seen, previous visit) and per-tour history live server-side, so rules hold
 * across devices once the site tells us who the user is.
 */
export async function recordVisit(
  project: { id: string; identitySalt: string },
  input: VisitRequest,
  now = new Date(),
): Promise<VisitResponse> {
  const visitorKey = visitorKeyFor(project.identitySalt, input);
  const where = { projectId_visitorKey: { projectId: project.id, visitorKey } };
  const prev = await db.visitorProfile.findUnique({
    where,
    select: {
      firstSeenAt: true,
      lastSeenAt: true,
      visitStartedAt: true,
      previousVisitAt: true,
      signedUpAt: true,
    },
  });
  const facts: VisitorFacts = {
    ...nextVisit(prev, now),
    signedUpAt: input.signedUpAt ?? prev?.signedUpAt ?? null,
  };
  await db.visitorProfile.upsert({
    where,
    create: { projectId: project.id, visitorKey, identified: !!input.userId, ...facts },
    update: facts,
  });

  const tours = await db.tour.findMany({
    where: { projectId: project.id, status: "PUBLISHED", triggerType: "AUTO" },
    select: {
      id: true,
      audience: true,
      audienceDays: true,
      audienceBefore: true,
      frequency: true,
      maxShows: true,
      intervalDays: true,
      startsAt: true,
      endsAt: true,
    },
  });
  if (!tours.length) return { visitorKey, eligibleTourIds: [] };
  const states = await db.tourVisitorState.findMany({
    where: { visitorKey, tourId: { in: tours.map((t) => t.id) } },
    select: { tourId: true, shows: true, lastShownAt: true, completedAt: true, skippedAt: true },
  });
  const byTour = new Map<string, TourHistory>(states.map((s) => [s.tourId, s]));
  return {
    visitorKey,
    eligibleTourIds: tours
      .filter((t) => isTourEligible(t, facts, byTour.get(t.id) ?? null, now))
      .map((t) => t.id),
  };
}
