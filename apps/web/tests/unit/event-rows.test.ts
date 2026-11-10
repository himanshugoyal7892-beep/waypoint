import { describe, expect, it } from "vitest";
import type { AnalyticsEventPayload } from "@waypoint/shared";
import { clampOccurredAt, toEventRows } from "@/server/public/event-rows";

const NOW = new Date("2026-11-10T12:00:00Z");
const ev = (o: Partial<AnalyticsEventPayload> = {}): AnalyticsEventPayload => ({
  clientEventId: "evt_12345678",
  tourId: "t1",
  tourVersion: 1,
  anonymousVisitorId: "vis_12345678",
  sessionId: "ses_12345678",
  eventName: "tour_started",
  currentUrl: "http://localhost:5173/",
  timestamp: NOW.getTime() - 1000,
  ...o,
});
const steps = new Map([["t1", new Set(["s1", "s2"])]]);

describe("clampOccurredAt", () => {
  it("keeps plausible client times and replaces skewed ones", () => {
    expect(clampOccurredAt(NOW.getTime() - 60_000, NOW).getTime()).toBe(NOW.getTime() - 60_000);
    expect(clampOccurredAt(NOW.getTime() + 25 * 3600_000, NOW).getTime()).toBe(NOW.getTime());
    expect(clampOccurredAt(0, NOW).getTime()).toBe(NOW.getTime());
  });
});

describe("toEventRows", () => {
  it("maps valid events and fills nullable fields", () => {
    const { rows, dropped } = toEventRows("p1", [ev()], steps, NOW);
    expect(dropped).toBe(0);
    expect(rows[0]).toMatchObject({
      projectId: "p1",
      tourId: "t1",
      stepId: null,
      stepOrder: null,
      errorCode: null,
    });
  });
  it("drops events for tours outside the project and steps outside the tour", () => {
    const { rows, dropped } = toEventRows(
      "p1",
      [
        ev({ tourId: "t_other" }),
        ev({ eventName: "step_viewed", stepId: "s_other", stepOrder: 1 }),
        ev({ eventName: "step_viewed", stepId: "s2", stepOrder: 2 }),
      ],
      steps,
      NOW,
    );
    expect(dropped).toBe(2);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.stepId).toBe("s2");
  });
  it("copies only whitelisted fields", () => {
    const sneaky = { ...ev(), pageText: "secret" } as AnalyticsEventPayload;
    const { rows } = toEventRows("p1", [sneaky], steps, NOW);
    expect(Object.keys(rows[0] ?? {})).not.toContain("pageText");
  });
});
