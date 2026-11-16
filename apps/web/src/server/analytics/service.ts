import "server-only";
import { db } from "../db";
import { ownProject, ownTour } from "../ownership";
import { computeTourAnalytics, dayKeys, type EventCountRow } from "./compute";

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

/** Project-wide visits, visitors and a per-tour summary for the last `days` days. */
export async function getProjectAnalytics(userId: string, projectId: string, days: RangeDays) {
  await ownProject(userId, projectId);
  const keys = dayKeys(days);
  const since = new Date(`${keys[0]}T00:00:00Z`);
  const [daily, active, identifiedActive, returning, tours, tourRows, recent] = await Promise.all([
    db.projectDailyStat.findMany({
      where: { projectId, day: { gte: since } },
      select: { day: true, visits: true, newVisitors: true, identifiedVisits: true },
    }),
    db.visitorProfile.count({ where: { projectId, lastSeenAt: { gte: since } } }),
    db.visitorProfile.count({ where: { projectId, lastSeenAt: { gte: since }, identified: true } }),
    db.visitorProfile.count({
      where: { projectId, lastSeenAt: { gte: since }, firstSeenAt: { lt: since } },
    }),
    db.tour.findMany({
      where: { projectId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, status: true, triggerType: true, audience: true },
    }),
    db.$queryRaw<{ tourId: string; eventName: string; total: number; visitors: number }[]>`
      SELECT "tourId", "eventName"::text AS "eventName",
             count(*)::int AS total, count(DISTINCT "anonymousVisitorId")::int AS visitors
      FROM "AnalyticsEvent"
      WHERE "projectId" = ${projectId} AND "occurredAt" >= ${since}
        AND "eventName" IN ('tour_started', 'tour_completed', 'tour_skipped')
      GROUP BY 1, 2`,
    db.visitorProfile.findMany({
      where: { projectId },
      orderBy: { lastSeenAt: "desc" },
      take: 20,
      select: {
        visitorKey: true,
        identified: true,
        firstSeenAt: true,
        lastSeenAt: true,
        visits: true,
      },
    }),
  ]);

  const byDay = new Map(daily.map((d) => [d.day.toISOString().slice(0, 10), d]));
  const series = keys.map((day) => {
    const d = byDay.get(day);
    return {
      day,
      visits: d?.visits ?? 0,
      newVisitors: d?.newVisitors ?? 0,
      identifiedVisits: d?.identifiedVisits ?? 0,
    };
  });
  const sum = (k: "visits" | "newVisitors" | "identifiedVisits") =>
    series.reduce((n, d) => n + d[k], 0);

  const states = recent.length
    ? await db.tourVisitorState.groupBy({
        by: ["visitorKey"],
        where: { visitorKey: { in: recent.map((r) => r.visitorKey) }, tour: { projectId } },
        _count: { _all: true, completedAt: true },
      })
    : [];
  const stateByKey = new Map(states.map((s) => [s.visitorKey, s._count]));

  const tourStats = tours.map((t) => {
    const get = (e: string) => tourRows.find((r) => r.tourId === t.id && r.eventName === e);
    const started = get("tour_started")?.total ?? 0;
    const completed = get("tour_completed")?.total ?? 0;
    return {
      ...t,
      started,
      visitors: get("tour_started")?.visitors ?? 0,
      completed,
      skipped: get("tour_skipped")?.total ?? 0,
      completionRate: started ? completed / started : 0,
    };
  });

  return {
    range: { days, from: since.toISOString(), to: new Date().toISOString() },
    totals: {
      visits: sum("visits"),
      newVisitors: sum("newVisitors"),
      identifiedVisits: sum("identifiedVisits"),
      activeVisitors: active,
      identifiedVisitors: identifiedActive,
      returningVisitors: returning,
    },
    series,
    tours: tourStats,
    recentVisitors: recent.map((r) => ({
      // Short, non-reversible label: the key is already a salted hash.
      label: `Visitor ${r.visitorKey.slice(0, 6)}`,
      identified: r.identified,
      firstSeenAt: r.firstSeenAt.toISOString(),
      lastSeenAt: r.lastSeenAt.toISOString(),
      visits: r.visits,
      toursSeen: stateByKey.get(r.visitorKey)?._all ?? 0,
      toursFinished: stateByKey.get(r.visitorKey)?.completedAt ?? 0,
    })),
  };
}
