import { describe, expect, it } from "vitest";
import { computeTourAnalytics, type EventCountRow } from "@/server/analytics/compute";

const steps = [
  { id: "s1", stepOrder: 1, title: "Search", description: "" },
  { id: "s2", stepOrder: 2, title: "", description: "Pick a product from the list" },
  { id: "s3", stepOrder: 3, title: "Checkout", description: "" },
];
const row = (
  eventName: string,
  stepOrder: number | null,
  total: number,
  visitors: number,
): EventCountRow => ({ eventName, stepOrder, total, visitors });

describe("computeTourAnalytics", () => {
  it("computes totals, rates and drop-off by step", () => {
    const a = computeTourAnalytics(
      [
        row("tour_started", null, 120, 100),
        row("tour_completed", null, 54, 50),
        row("tour_skipped", null, 30, 28),
        row("step_viewed", 1, 130, 100),
        row("step_viewed", 2, 90, 80),
        row("step_viewed", 3, 60, 52),
        row("element_not_found", 2, 4, 3),
      ],
      steps,
    );
    expect(a).toMatchObject({
      uniqueVisitorsStarted: 100,
      totalStarts: 120,
      totalCompletions: 54,
      totalSkips: 30,
      elementNotFound: 4,
    });
    expect(a.completionRate).toBeCloseTo(0.45);
    expect(a.skipRate).toBeCloseTo(0.25);
    expect(a.steps.map((s) => [s.uniqueViewers, s.dropOffFromPrevious, s.reachRate])).toEqual([
      [100, 0, 1],
      [80, 20, 0.8],
      [52, 28, 0.52],
    ]);
    expect(a.steps[1]).toMatchObject({ label: "Pick a product from the list", elementNotFound: 4 });
  });

  it("handles a tour with no events", () => {
    const a = computeTourAnalytics([], steps);
    expect(a.completionRate).toBe(0);
    expect(a.steps.every((s) => s.uniqueViewers === 0 && s.reachRate === 0)).toBe(true);
  });
});
