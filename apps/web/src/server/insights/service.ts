import "server-only";
import { db } from "../db";
import { ownProject } from "../ownership";
import { buildChecklist, type Checklist } from "./checklist";
import { computeTourHealth, type HealthResult } from "./health";

const DAY_MS = 24 * 60 * 60 * 1000;
const HEALTH_WINDOW_DAYS = 30;

interface EventRow {
  projectId: string;
  tourId: string;
  eventName: string;
  stepOrder: number | null;
  total: number;
}

export interface TourInsight {
  id: string;
  name: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  triggerType: "AUTO" | "MANUAL";
  stepCount: number;
  updatedAt: string;
  started30d: number;
  completed30d: number;
  health: HealthResult;
}

export interface ProjectInsights {
  id: string;
  name: string;
  domain: string;
  checklist: Checklist;
  tours: TourInsight[];
  kpis: { visits7d: number; starts7d: number; completions7d: number; liveTours: number };
}

function isTargeted(t: {
  triggerType: string;
  audience: string;
  loginState: string;
  device: string;
  frequency: string;
  priority: number;
  startsAt: Date | null;
  endsAt: Date | null;
}) {
  return (
    t.audience !== "ALL" ||
    t.loginState !== "ANY" ||
    t.device !== "ANY" ||
    t.frequency !== "ONCE" ||
    t.priority > 0 ||
    t.startsAt !== null ||
    t.endsAt !== null
  );
}

async function loadInsights(projectIds: string[]): Promise<ProjectInsights[]> {
  if (!projectIds.length) return [];
  const now = Date.now();
  const since30 = new Date(now - HEALTH_WINDOW_DAYS * DAY_MS);
  const since7 = new Date(now - 7 * DAY_MS);
  const today = new Date(now);
  const day7 = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - 6 * DAY_MS,
  );

  const [projects, rows, rows7, visits, visitorCounts, completedEver] = await Promise.all([
    db.project.findMany({
      where: { id: { in: projectIds } },
      select: {
        id: true,
        name: true,
        domain: true,
        allowedOrigins: true,
        identitySource: true,
        themeColor: true,
        tours: {
          where: { status: { not: "ARCHIVED" } },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            name: true,
            status: true,
            triggerType: true,
            audience: true,
            loginState: true,
            device: true,
            frequency: true,
            priority: true,
            startsAt: true,
            endsAt: true,
            updatedAt: true,
            steps: {
              orderBy: { stepOrder: "asc" },
              select: { stepOrder: true, title: true, description: true },
            },
          },
        },
      },
    }),
    db.$queryRaw<EventRow[]>`
      SELECT "projectId", "tourId", "eventName"::text AS "eventName", "stepOrder", count(*)::int AS total
      FROM "AnalyticsEvent"
      WHERE "projectId" = ANY(${projectIds}) AND "occurredAt" >= ${since30}
        AND "eventName" IN ('tour_started','tour_completed','step_viewed','element_not_found')
      GROUP BY 1, 2, 3, 4`,
    db.$queryRaw<{ projectId: string; eventName: string; total: number }[]>`
      SELECT "projectId", "eventName"::text AS "eventName", count(*)::int AS total
      FROM "AnalyticsEvent"
      WHERE "projectId" = ANY(${projectIds}) AND "occurredAt" >= ${since7}
        AND "eventName" IN ('tour_started','tour_completed')
      GROUP BY 1, 2`,
    db.projectDailyStat.groupBy({
      by: ["projectId"],
      where: { projectId: { in: projectIds }, day: { gte: day7 } },
      _sum: { visits: true },
    }),
    db.visitorProfile.groupBy({
      by: ["projectId"],
      where: { projectId: { in: projectIds } },
      _count: { _all: true },
    }),
    db.analyticsEvent.groupBy({
      by: ["projectId"],
      where: { projectId: { in: projectIds }, eventName: "tour_completed" },
      _count: { _all: true },
    }),
  ]);

  const order = new Map(projectIds.map((id, i) => [id, i]));
  return projects
    .sort((a, b) => order.get(a.id)! - order.get(b.id)!)
    .map((p) => {
      const tours: TourInsight[] = p.tours.map((t) => {
        const mine = rows.filter((r) => r.tourId === t.id);
        const sum = (e: string) =>
          mine.filter((r) => r.eventName === e).reduce((n, r) => n + r.total, 0);
        const byStep = (e: string) =>
          Object.fromEntries(
            mine
              .filter((r) => r.eventName === e && r.stepOrder !== null)
              .map((r) => [r.stepOrder!, r.total]),
          );
        const started = sum("tour_started");
        const completed = sum("tour_completed");
        return {
          id: t.id,
          name: t.name,
          status: t.status,
          triggerType: t.triggerType,
          stepCount: t.steps.length,
          updatedAt: t.updatedAt.toISOString(),
          started30d: started,
          completed30d: completed,
          health: computeTourHealth({
            status: t.status,
            aimed: t.triggerType === "MANUAL" || isTargeted(t),
            steps: t.steps.map((s) => ({ ...s, description: s.description ?? "" })),
            started,
            completed,
            viewedByStep: byStep("step_viewed"),
            missingByStep: byStep("element_not_found"),
          }),
        };
      });
      const r7 = rows7.filter((r) => r.projectId === p.id);
      const targeted = p.tours.find((t) => isTargeted(t));
      const published = p.tours.find((t) => t.status === "PUBLISHED");
      return {
        id: p.id,
        name: p.name,
        domain: p.domain,
        tours,
        kpis: {
          visits7d: visits.find((v) => v.projectId === p.id)?._sum.visits ?? 0,
          starts7d: r7.find((r) => r.eventName === "tour_started")?.total ?? 0,
          completions7d: r7.find((r) => r.eventName === "tour_completed")?.total ?? 0,
          liveTours: p.tours.filter((t) => t.status === "PUBLISHED").length,
        },
        checklist: buildChecklist({
          projectBase: `/dashboard/projects/${p.id}`,
          hasRealOrigin: p.allowedOrigins.some(
            (o) => !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(o),
          ),
          snippetSeen:
            (visitorCounts.find((v) => v.projectId === p.id)?._count._all ?? 0) > 0 ||
            rows.some((r) => r.projectId === p.id),
          tourWithSteps: p.tours.find((t) => t.steps.length >= 3)?.id ?? null,
          anyPublished: !!published,
          identityConfigured: p.identitySource !== "NONE",
          targetedTour: targeted?.id ?? null,
          suggestTargetTour: published?.id ?? p.tours[0]?.id ?? null,
          themeColorSet: !!p.themeColor,
          anyCompletion: (completedEver.find((c) => c.projectId === p.id)?._count._all ?? 0) > 0,
        }),
      };
    });
}

export async function getProjectInsights(userId: string, projectId: string) {
  await ownProject(userId, projectId);
  const [one] = await loadInsights([projectId]);
  return one!;
}

/** Every project of the user, most recently created first. */
export async function getHomeInsights(userId: string) {
  const ids = await db.project.findMany({
    where: { createdById: userId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return loadInsights(ids.map((p) => p.id));
}
