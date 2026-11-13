import type { PublicTour } from "@waypoint/shared/api-types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TourEngine, type EngineDeps } from "../src/runtime/engine";
import { safeStore } from "../src/storage";
import { TourUI } from "../src/ui/tooltip";

const step = (
  n: number,
  over: Partial<PublicTour["steps"][number]> = {},
): PublicTour["steps"][number] => ({
  id: `s${n}`,
  stepOrder: n,
  title: `Title ${n}`,
  description: `Body ${n}`,
  cssSelector: `[data-tour-id="t${n}"]`,
  pageUrl: "/",
  placement: "BOTTOM",
  nextButtonLabel: "Next",
  backButtonLabel: "Back",
  allowSkip: true,
  ...over,
});

const tour = (over: Partial<PublicTour> = {}): PublicTour => ({
  id: "tour1",
  version: 3,
  name: "Demo",
  triggerType: "AUTO",
  frequency: "ONCE",
  startUrl: "/",
  steps: [step(1), step(2), step(3)],
  ...over,
});

function addTargets(...ids: string[]) {
  for (const id of ids) {
    const b = document.createElement("button");
    b.setAttribute("data-tour-id", id);
    b.textContent = id;
    document.body.append(b);
  }
}

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

function setup(tours: PublicTour[], over: Partial<EngineDeps> = {}) {
  const events: { eventName: string; stepOrder?: number; errorCode?: string }[] = [];
  const navigate = vi.fn();
  const deps: EngineDeps = {
    loadTours: vi.fn(async () => tours),
    analytics: { track: (e) => events.push(e), flush: vi.fn() },
    local: safeStore("local"),
    session: safeStore("session"),
    navigate,
    findTimeoutMs: 80,
    ...over,
  };
  return { engine: new TourEngine(deps), events, navigate, deps };
}

const host = () => document.querySelector("[data-ptour-host]");
const shadow = () => host()?.shadowRoot ?? null;
const q = (sel: string) => shadow()?.querySelector<HTMLElement>(sel) ?? null;
const buttons = () =>
  Array.from(shadow()?.querySelectorAll<HTMLButtonElement>(".footer button") ?? []).map(
    (b) => b.textContent,
  );
const click = (label: string) =>
  Array.from(shadow()!.querySelectorAll<HTMLButtonElement>("button"))
    .find((b) => b.textContent === label || b.getAttribute("aria-label") === label)!
    .click();
const names = (events: { eventName: string }[]) => events.map((e) => e.eventName);

beforeEach(() => {
  history.replaceState({}, "", "/");
  // happy-dom has no layout engine: give every element a visible, in-viewport box.
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    x: 100,
    y: 100,
    top: 100,
    left: 100,
    width: 120,
    height: 40,
    right: 220,
    bottom: 140,
    toJSON: () => ({}),
  } as DOMRect);
});
afterEach(() => {
  TourUI.destroyAll();
  document.body.textContent = "";
  localStorage.clear();
  sessionStorage.clear();
});

describe("auto-start and navigation", () => {
  it("shows step 1 with title, description, counter, ARIA and the right buttons", async () => {
    addTargets("t1", "t2", "t3");
    const { engine, events } = setup([tour()]);
    await engine.evaluate();
    await tick();
    expect(q(".title")?.textContent).toBe("Title 1");
    expect(q(".body")?.textContent).toBe("Body 1");
    expect(q(".counter")?.textContent).toBe("1 of 3");
    const dialog = q(".tooltip")!;
    expect(dialog.getAttribute("role")).toBe("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(shadow()!.getElementById(dialog.getAttribute("aria-labelledby")!)?.textContent).toBe(
      "Title 1",
    );
    expect(buttons()).toEqual(["Skip", "Next"]); // no Back on the first step
    expect(names(events)).toEqual(["tour_started", "step_viewed"]);
  });

  it("goes Next → Back → Next → Finish and records every event", async () => {
    addTargets("t1", "t2", "t3");
    const { engine, events, deps } = setup([tour()]);
    await engine.evaluate();
    await tick();
    click("Next");
    await tick();
    expect(q(".counter")?.textContent).toBe("2 of 3");
    expect(buttons()).toEqual(["Skip", "Back", "Next"]);
    click("Back");
    await tick();
    expect(q(".counter")?.textContent).toBe("1 of 3");
    click("Next");
    await tick();
    click("Next");
    await tick();
    expect(buttons()).toEqual(["Back", "Finish"]); // last step: Finish, no Skip
    click("Finish");
    await tick();
    expect(host()).toBeNull();
    expect(names(events)).toEqual([
      "tour_started",
      "step_viewed",
      "next_clicked",
      "step_viewed",
      "back_clicked",
      "step_viewed",
      "next_clicked",
      "step_viewed",
      "next_clicked",
      "step_viewed",
      "next_clicked",
      "tour_completed",
    ]);
    expect(deps.local.get("seen:tour1")).toBe("completed");
    expect(deps.session.get("active")).toBeNull();
  });

  it("does not auto-start a tour the visitor already completed or skipped", async () => {
    addTargets("t1");
    const first = setup([tour()]);
    await first.engine.evaluate();
    await tick();
    click("Skip");
    expect(first.events.at(-1)?.eventName).toBe("tour_skipped");
    const second = setup([tour()]);
    await second.engine.evaluate();
    await tick();
    expect(host()).toBeNull();
    expect(second.events).toEqual([]);
  });

  it("only auto-starts AUTO tours on a matching start URL", async () => {
    addTargets("t1");
    const manual = setup([tour({ triggerType: "MANUAL" })]);
    await manual.engine.evaluate();
    expect(host()).toBeNull();
    const elsewhere = setup([tour({ startUrl: "/products/*" })]);
    await elsewhere.engine.evaluate();
    expect(host()).toBeNull();
  });

  it("starts MANUAL tours via start(tourId)", async () => {
    addTargets("t1");
    const { engine } = setup([tour({ triggerType: "MANUAL" })]);
    expect(await engine.start("tour1")).toBe(true);
    await tick();
    expect(q(".title")?.textContent).toBe("Title 1");
    expect(await engine.start("nope")).toBe(false);
  });

  it("hides Skip when allowSkip is false and uses custom labels", async () => {
    addTargets("t1", "t2");
    const { engine } = setup([
      tour({ steps: [step(1, { allowSkip: false, nextButtonLabel: "Continue" }), step(2)] }),
    ]);
    await engine.evaluate();
    await tick();
    expect(buttons()).toEqual(["Continue"]);
  });
});

describe("keyboard and accessibility", () => {
  it("Escape closes the tour (as a skip) and restores focus", async () => {
    addTargets("t1", "t2");
    const before = document.createElement("input");
    document.body.append(before);
    before.focus();
    const { engine, events } = setup([tour({ steps: [step(1), step(2)] })]);
    await engine.evaluate();
    await tick();
    expect(shadow()!.activeElement?.textContent).toBe("Next"); // focus moved into the tooltip
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(host()).toBeNull();
    expect(events.at(-1)?.eventName).toBe("tour_skipped");
    expect(document.activeElement).toBe(before);
  });

  it("keeps Tab focus inside the tooltip", async () => {
    addTargets("t1", "t2");
    const { engine } = setup([tour({ steps: [step(1), step(2)] })]);
    await engine.evaluate();
    await tick();
    const order: string[] = [];
    for (let i = 0; i < 4; i++) {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", cancelable: true }));
      const active = shadow()!.activeElement as HTMLElement;
      order.push(active.getAttribute("aria-label") ?? active.textContent ?? "");
    }
    expect(order).toEqual(["Close tour", "Skip", "Next", "Close tour"]);
  });

  it("the close icon skips the tour", async () => {
    addTargets("t1", "t2");
    const { engine, events } = setup([tour({ steps: [step(1), step(2)] })]);
    await engine.evaluate();
    await tick();
    click("Close tour");
    expect(host()).toBeNull();
    expect(events.at(-1)?.eventName).toBe("tour_skipped");
  });
});

describe("safety", () => {
  it("renders content as plain text, never HTML", async () => {
    addTargets("t1");
    const { engine } = setup([
      tour({
        steps: [
          step(1, {
            title: '<img src=x onerror="window.__xss=1">',
            description: "<script>alert(1)</script>",
          }),
        ],
      }),
    ]);
    await engine.evaluate();
    await tick();
    expect(q(".title")?.textContent).toBe('<img src=x onerror="window.__xss=1">');
    expect(shadow()!.querySelector("img, script")).toBeNull();
    expect((window as unknown as { __xss?: number }).__xss).toBeUndefined();
  });

  it("leaves no SDK nodes behind and does not modify the host page", async () => {
    addTargets("t1");
    const snapshot = document.body.cloneNode(true);
    const { engine } = setup([tour({ steps: [step(1)] })]);
    await engine.evaluate();
    await tick();
    expect(document.body.isEqualNode(snapshot)).toBe(true); // UI lives in <html>, outside <body>
    click("Finish");
    expect(document.querySelectorAll("[data-ptour-host]")).toHaveLength(0);
  });

  it("survives a failing tours request", async () => {
    const { engine } = setup([], {
      loadTours: vi.fn(async () => Promise.reject(new Error("network"))),
    });
    await expect(engine.evaluate()).resolves.toBeUndefined();
    expect(host()).toBeNull();
  });
});

describe("missing elements", () => {
  it("records element_not_found and skips to the next step", async () => {
    addTargets("t2", "t3");
    const { engine, events } = setup([tour()]);
    await engine.evaluate();
    await tick(150);
    expect(events.find((e) => e.eventName === "element_not_found")).toMatchObject({
      stepOrder: 1,
      errorCode: "timeout",
    });
    expect(q(".counter")?.textContent).toBe("2 of 3");
  });

  it("ends gracefully when nothing can be shown", async () => {
    const real = document.querySelectorAll.bind(document);
    vi.spyOn(document, "querySelectorAll").mockImplementation(((sel: string) => {
      if (sel === "div[[[") throw new DOMException("bad selector", "SyntaxError");
      return real(sel);
    }) as typeof document.querySelectorAll);
    const { engine, events } = setup([tour({ steps: [step(1, { cssSelector: "div[[[" })] })]);
    await engine.evaluate();
    await tick(20);
    expect(events.map((e) => e.errorCode).filter(Boolean)).toEqual(["invalid_selector"]);
    expect(host()).toBeNull();
  });

  it("waits for elements that render late", async () => {
    const { engine } = setup([tour({ steps: [step(1)] })]);
    await engine.evaluate();
    setTimeout(() => addTargets("t1"), 20);
    await tick(60);
    expect(q(".title")?.textContent).toBe("Title 1");
  });
});

describe("cross-page tours and SPA navigation", () => {
  const multi = () =>
    tour({
      steps: [
        step(1),
        step(2, { pageUrl: "/products/aurora" }),
        step(3, { pageUrl: "/products/aurora" }),
      ],
    });

  it("navigates to the next step's page and saves progress", async () => {
    addTargets("t1");
    const { engine, navigate, deps } = setup([multi()]);
    await engine.evaluate();
    await tick();
    click("Next");
    expect(navigate).toHaveBeenCalledWith("/products/aurora");
    expect(deps.analytics.flush).toHaveBeenCalledWith(true);
    expect(JSON.parse(deps.session.get("active")!)).toEqual({
      tourId: "tour1",
      version: 3,
      stepIndex: 1,
    });
  });

  it("resumes on the new page after a full reload without a second tour_started", async () => {
    sessionStorage.setItem(
      "ptour:active",
      JSON.stringify({ tourId: "tour1", version: 3, stepIndex: 1 }),
    );
    history.replaceState({}, "", "/products/aurora");
    addTargets("t2", "t3");
    const { engine, events } = setup([multi()]);
    await engine.evaluate();
    await tick();
    expect(q(".counter")?.textContent).toBe("2 of 3");
    expect(names(events)).toEqual(["step_viewed"]);
  });

  it("discards saved progress when the tour was republished (version changed)", async () => {
    sessionStorage.setItem(
      "ptour:active",
      JSON.stringify({ tourId: "tour1", version: 2, stepIndex: 1 }),
    );
    history.replaceState({}, "", "/products/aurora");
    const { engine, deps } = setup([multi()]);
    await engine.evaluate();
    expect(host()).toBeNull();
    expect(deps.session.get("active")).toBeNull();
  });

  it("advances when the visitor follows the step themselves in a single-page app", async () => {
    addTargets("t1", "t2");
    const { engine } = setup([multi()]);
    await engine.evaluate();
    await tick();
    history.pushState({}, "", "/products/aurora"); // e.g. clicked the highlighted product card
    await engine.evaluate();
    await tick();
    expect(q(".counter")?.textContent).toBe("2 of 3");
  });

  it("continues after in-app (SPA) navigation for cross-page Next and Back", async () => {
    addTargets("t1", "t2");
    const { engine, events } = setup([multi()], {
      navigate: (path) => history.pushState({}, "", path),
    });
    await engine.evaluate();
    await tick();
    click("Next"); // step 2 lives on /products/aurora → in-app navigation
    await engine.evaluate(); // the URL watcher calls this after the route change
    await tick();
    expect(q(".counter")?.textContent).toBe("2 of 3");
    click("Back"); // step 1 lives on /
    await engine.evaluate();
    await tick();
    expect(q(".counter")?.textContent).toBe("1 of 3");
    expect(names(events).filter((n) => n === "tour_started")).toHaveLength(1);
  });

  it("hides the tooltip on unrelated routes", async () => {
    addTargets("t1");
    const { engine } = setup([multi()]);
    await engine.evaluate();
    await tick();
    history.pushState({}, "", "/about");
    await engine.evaluate();
    expect(q(".tooltip")).toBeNull();
  });

  it("stop() and reset() clear UI and remembered state", async () => {
    addTargets("t1");
    const { engine, deps } = setup([tour()]);
    await engine.evaluate();
    await tick();
    engine.stop();
    expect(host()).toBeNull();
    deps.local.set("seen:tour1", "completed");
    engine.reset();
    expect(deps.local.get("seen:tour1")).toBeNull();
  });
});

describe("host page removing our UI", () => {
  it("re-attaches the tour UI if the page removes it (e.g. framework hydration)", async () => {
    addTargets("t1", "t2");
    const { engine } = setup([tour({ steps: [step(1), step(2)] })]);
    await engine.evaluate();
    await tick();
    host()!.remove();
    await tick();
    expect(host()).not.toBeNull();
    expect(q(".title")?.textContent).toBe("Title 1");
    engine.stop();
    await tick();
    expect(host()).toBeNull(); // our own removal is not undone
  });
});

describe("targeting (server-decided eligibility)", () => {
  it("only auto-starts tours the server allows for this visit", async () => {
    addTargets("t1", "t2", "t3");
    const blocked = tour({ id: "blocked" });
    const allowed = tour({ id: "allowed", frequency: "INTERVAL" });
    const { engine } = setup([blocked, allowed], {
      eligibleTours: async () => new Set(["allowed"]),
    });
    await engine.evaluate();
    await tick();
    expect(q(".title")?.textContent).toBe("Title 1");
    expect(sessionStorage.getItem("ptour:shown:allowed")).toBe("1");
    expect(sessionStorage.getItem("ptour:shown:blocked")).toBeNull();
  });

  it("shows nothing when the server allows nothing", async () => {
    addTargets("t1", "t2", "t3");
    const { engine } = setup([tour()], { eligibleTours: async () => new Set() });
    await engine.evaluate();
    await tick();
    expect(host()).toBeNull();
  });

  it("never auto-shows the same tour twice in one visit, even if allowed", async () => {
    addTargets("t1", "t2", "t3");
    const t = tour({ frequency: "UNTIL_COMPLETED" });
    const { engine } = setup([t], { eligibleTours: async () => new Set([t.id]) });
    await engine.evaluate();
    await tick();
    click("Skip");
    expect(host()).toBeNull();
    history.replaceState({}, "", "/other");
    history.replaceState({}, "", "/");
    await engine.evaluate();
    await tick();
    expect(host()).toBeNull();
  });

  it("repeating tours ignore the old once-per-browser flag; 'once' tours keep it", async () => {
    addTargets("t1", "t2", "t3");
    localStorage.setItem("ptour:seen:rep", "skipped");
    localStorage.setItem("ptour:seen:once", "skipped");
    const { engine } = setup([tour({ id: "once" }), tour({ id: "rep", frequency: "INTERVAL" })], {
      eligibleTours: async () => new Set(["once", "rep"]),
    });
    await engine.evaluate();
    await tick();
    expect(sessionStorage.getItem("ptour:shown:rep")).toBe("1");
    expect(sessionStorage.getItem("ptour:shown:once")).toBeNull();
  });

  it("falls back to once-per-browser when the server can't be reached", async () => {
    addTargets("t1", "t2", "t3");
    localStorage.setItem("ptour:seen:tour1", "completed");
    const { engine } = setup([tour()], { eligibleTours: async () => null });
    await engine.evaluate();
    await tick();
    expect(host()).toBeNull();
  });
});
