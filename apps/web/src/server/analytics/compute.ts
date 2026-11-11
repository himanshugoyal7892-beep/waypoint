/** Pure analytics aggregation (no database), so it can be unit-tested. */

export interface EventCountRow {
  eventName: string;
  stepOrder: number | null;
  total: number;
  visitors: number;
}

export interface StepInfo {
  id: string;
  stepOrder: number;
  title: string;
  description: string;
}

export interface StepAnalytics {
  stepOrder: number;
  stepId: string;
  label: string;
  uniqueViewers: number;
  /** Share of starters who reached this step (0–1). */
  reachRate: number;
  /** Visitors lost since the previous step (0 for step 1). */
  dropOffFromPrevious: number;
  elementNotFound: number;
}

export interface TourAnalytics {
  uniqueVisitorsStarted: number;
  totalStarts: number;
  totalCompletions: number;
  completionRate: number;
  totalSkips: number;
  skipRate: number;
  elementNotFound: number;
  steps: StepAnalytics[];
}

const rate = (n: number, d: number) => (d > 0 ? Math.min(1, n / d) : 0);

export function computeTourAnalytics(
  rows: readonly EventCountRow[],
  steps: readonly StepInfo[],
): TourAnalytics {
  const sum = (name: string) =>
    rows.filter((r) => r.eventName === name).reduce((n, r) => n + r.total, 0);
  const visitorsFor = (name: string, order: number | null) =>
    rows.find((r) => r.eventName === name && r.stepOrder === order)?.visitors ?? 0;

  const totalStarts = sum("tour_started");
  const uniqueVisitorsStarted = rows
    .filter((r) => r.eventName === "tour_started")
    .reduce((n, r) => n + r.visitors, 0);
  const totalCompletions = sum("tour_completed");
  const totalSkips = sum("tour_skipped");

  let previous = 0;
  const stepRows = [...steps]
    .sort((a, b) => a.stepOrder - b.stepOrder)
    .map((s, i) => {
      const viewers = visitorsFor("step_viewed", s.stepOrder);
      const row: StepAnalytics = {
        stepOrder: s.stepOrder,
        stepId: s.id,
        label: s.title || s.description.slice(0, 60) || `Step ${s.stepOrder}`,
        uniqueViewers: viewers,
        reachRate: rate(viewers, uniqueVisitorsStarted),
        dropOffFromPrevious: i === 0 ? 0 : Math.max(0, previous - viewers),
        elementNotFound: rows
          .filter((r) => r.eventName === "element_not_found" && r.stepOrder === s.stepOrder)
          .reduce((n, r) => n + r.total, 0),
      };
      previous = viewers;
      return row;
    });

  return {
    uniqueVisitorsStarted,
    totalStarts,
    totalCompletions,
    completionRate: rate(totalCompletions, totalStarts),
    totalSkips,
    skipRate: rate(totalSkips, totalStarts),
    elementNotFound: sum("element_not_found"),
    steps: stepRows,
  };
}
