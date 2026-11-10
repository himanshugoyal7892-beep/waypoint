import { describe, expect, it } from "vitest";
import { validatePublishable, type PublishableTour } from "../src/publish-rules";

const step = (n: number, overrides: Partial<PublishableTour["steps"][number]> = {}) => ({
  id: `s${n}`,
  stepOrder: n,
  pageUrl: "/",
  cssSelector: `[data-tour-id="s${n}"]`,
  title: `Step ${n}`,
  description: "",
  ...overrides,
});

const tour = (overrides: Partial<PublishableTour> = {}): PublishableTour => ({
  status: "DRAFT",
  startUrl: "/",
  project: { allowedOrigins: ["http://localhost:5173"] },
  steps: [step(1), step(2)],
  ...overrides,
});

const codes = (t: PublishableTour) => validatePublishable(t).map((i) => i.code);

describe("validatePublishable", () => {
  it("passes a valid tour", () => expect(validatePublishable(tour())).toEqual([]));

  it("requires at least one step", () => expect(codes(tour({ steps: [] }))).toContain("NO_STEPS"));

  it("requires a valid pathname on every step", () => {
    const issues = validatePublishable(tour({ steps: [step(1), step(2, { pageUrl: "cart" })] }));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      code: "INVALID_PAGE_URL",
      stepId: "s2",
      stepOrder: 2,
      field: "pageUrl",
    });
    expect(issues[0]?.message).toMatch(/^Step 2:/);
  });

  it("requires a non-empty selector", () =>
    expect(codes(tour({ steps: [step(1, { cssSelector: "   " })] }))).toEqual([
      "MISSING_SELECTOR",
    ]));

  it("requires a title or a description", () => {
    expect(codes(tour({ steps: [step(1, { title: "", description: "" })] }))).toEqual([
      "MISSING_CONTENT",
    ]);
    expect(codes(tour({ steps: [step(1, { title: "", description: "Body only" })] }))).toEqual([]);
  });

  it("requires sequential, unique ordering", () => {
    expect(codes(tour({ steps: [step(1), step(3)] }))).toContain("STEP_ORDER");
    expect(codes(tour({ steps: [step(1), step(1, { id: "dup" })] }))).toContain("STEP_ORDER");
  });

  it("requires at least one allowed domain", () =>
    expect(codes(tour({ project: { allowedOrigins: [] } }))).toEqual(["NO_ALLOWED_ORIGIN"]));

  it("rejects archived tours and invalid start URLs", () => {
    expect(codes(tour({ status: "ARCHIVED" }))).toContain("TOUR_ARCHIVED");
    expect(codes(tour({ startUrl: "products" }))).toContain("INVALID_START_URL");
  });

  it("reports every problem at once", () => {
    const issues = validatePublishable(
      tour({
        project: { allowedOrigins: [] },
        steps: [step(1, { cssSelector: "", title: "" }), step(3, { pageUrl: "/x?y" })],
      }),
    );
    expect(issues.map((i) => i.code).sort()).toEqual(
      [
        "INVALID_PAGE_URL",
        "MISSING_CONTENT",
        "MISSING_SELECTOR",
        "NO_ALLOWED_ORIGIN",
        "STEP_ORDER",
      ].sort(),
    );
  });
});
