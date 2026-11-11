import "server-only";
import { db } from "../db";
import { ownTour } from "../ownership";
import { computeTourAnalytics, type EventCountRow } from "./compute";

export const RANGE_DAYS = [7, 30, 90] as const;
export type RangeDays = (typeof RANGE_DAYS)[number];

export function parseRange(value: string | null | undefined): RangeDays {
  const n = Number(value);
  return (RANGE_DAYS as readonly number[]).includes(n) ? (n as RangeDays) : 30;
}

/** Aggregates a tour's events for the last `days` days (one grouped SQL query). */
export async function getTourAnalytics(userId: string, tourId: string, days: RangeDays) {
  await ownTour(userId, tourId);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [rows, steps] = await Promise.all([
    db.$queryRaw<EventCountRow[]>`
      SELECT "eventName"::text AS "eventName", "stepOrder",
             count(*)::int AS total, count(DISTINCT "anonymousVisitorId")::int AS visitors
      FROM "AnalyticsEvent"
      WHERE "tourId" = ${tourId} AND "occurredAt" >= ${since}
      GROUP BY 1, 2`,
    db.tourStep.findMany({
      where: { tourId },
      orderBy: { stepOrder: "asc" },
      select: { id: true, stepOrder: true, title: true, description: true },
    }),
  ]);
  return {
    range: { days, from: since.toISOString(), to: new Date().toISOString() },
    ...computeTourAnalytics(rows, steps),
  };
}
