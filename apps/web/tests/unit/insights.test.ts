import { describe, expect, it } from "vitest";
import { buildChecklist, type ChecklistFacts } from "@/server/insights/checklist";
import { computeTourHealth, gradeFor, type HealthInput } from "@/server/insights/health";

const steps = (n: number, desc = "Short helpful text.") =>
  Array.from({ length: n }, (_, i) => ({
    stepOrder: i + 1,
    title: `Step ${i + 1}`,
    description: desc,
  }));

const base = (over: Partial<HealthInput> = {}): HealthInput => ({
  status: "PUBLISHED",
  aimed: true,
  steps: steps(5),
  started: 100,
  completed: 70,
  viewedByStep: { 1: 100, 2: 90, 3: 85, 4: 80, 5: 75 },
  missingByStep: {},
  ...over,
});

describe("tour health", () => {
  it("scores a healthy tour as an A with no tips", () => {
    const h = computeTourHealth(base());
    expect(h.score).toBe(100);
    expect(h.grade).toBe("A");
    expect(h.provisional).toBe(false);
    expect(h.tips).toEqual([]);
  });

  it("points at the step where most people leave", () => {
    const h = computeTourHealth(
      base({ completed: 20, viewedByStep: { 1: 100, 2: 95, 3: 40, 4: 30, 5: 25 } }),
    );
    expect(h.score).toBeLessThan(85);
    expect(h.tips[0]).toContain("step 3");
    expect(h.tips[0]).toContain("20%");
  });

  it("flags missing elements and names the worst step", () => {
    const h = computeTourHealth(base({ missingByStep: { 4: 30 } }));
    expect(h.parts.find((p) => p.key === "reliability")!.points).toBeLessThan(25);
    expect(h.tips.some((t) => t.includes("step 4") && t.includes("visual builder"))).toBe(true);
  });

  it("is provisional with few starts, scaled to the parts it can judge", () => {
    const h = computeTourHealth(base({ started: 2, completed: 1, viewedByStep: { 1: 2 } }));
    expect(h.provisional).toBe(true);
    expect(h.parts.find((p) => p.key === "completion")!.pending).toBe(true);
    expect(h.score).toBe(100); // length, copy and setup are all perfect
    expect(h.tips[0]).toContain("2 so far");
  });

  it("penalises long tours, missing copy, drafts and untargeted tours", () => {
    const h = computeTourHealth(
      base({
        status: "DRAFT",
        aimed: false,
        steps: steps(12, ""),
        started: 0,
        completed: 0,
        viewedByStep: {},
      }),
    );
    expect(h.grade).toBe("D");
    expect(h.tips.join(" ")).toMatch(/Publish/);
    expect(h.tips.join(" ")).toMatch(/12 steps is long/);
    expect(h.tips.join(" ")).toMatch(/description to step 1, 2/);
  });

  it("grades at the documented boundaries", () => {
    expect([85, 84, 70, 69, 55, 54].map(gradeFor)).toEqual(["A", "B", "B", "C", "C", "D"]);
  });
});

describe("launch checklist", () => {
  const facts = (over: Partial<ChecklistFacts> = {}): ChecklistFacts => ({
    projectBase: "/dashboard/projects/p1",
    hasRealOrigin: false,
    snippetSeen: false,
    tourWithSteps: null,
    anyPublished: false,
    identityConfigured: false,
    targetedTour: null,
    suggestTargetTour: null,
    themeColorSet: false,
    anyCompletion: false,
    ...over,
  });

  it("starts at zero with the first step next", () => {
    const c = buildChecklist(facts());
    expect(c.done).toBe(0);
    expect(c.level.name).toBe("Getting started");
    expect(c.next?.key).toBe("origin");
    expect(c.next?.href).toBe("/dashboard/projects/p1/settings#allowedOrigins");
  });

  it("levels up as items are done and links to the right tour", () => {
    const c = buildChecklist(
      facts({
        hasRealOrigin: true,
        snippetSeen: true,
        tourWithSteps: "t1",
        anyPublished: true,
        suggestTargetTour: "t1",
      }),
    );
    expect(c.done).toBe(4);
    expect(c.level.name).toBe("Taking shape");
    expect(c.items.find((i) => i.key === "target")!.href).toBe(
      "/dashboard/projects/p1/tours/t1?tab=who",
    );
  });

  it("is launch ready when everything is done", () => {
    const c = buildChecklist(
      facts({
        hasRealOrigin: true,
        snippetSeen: true,
        tourWithSteps: "t1",
        anyPublished: true,
        identityConfigured: true,
        targetedTour: "t1",
        themeColorSet: true,
        anyCompletion: true,
      }),
    );
    expect(c.progress).toBe(1);
    expect(c.level.name).toBe("Launch ready");
    expect(c.next).toBeNull();
  });
});
