import type { PublicTour } from "@waypoint/shared/api-types";
import { matchPathPattern, normalizePathname } from "@waypoint/shared/url";
import type { EventQueue, TrackInput } from "../analytics/queue";
import { readJson, type KeyValueStore } from "../storage";
import { TourUI } from "../ui/tooltip";
import { findElement, isInViewport, type FindResult } from "./find-element";

export interface EngineDeps {
  loadTours(path: string): Promise<PublicTour[]>;
  analytics: Pick<EventQueue, "track" | "flush">;
  local: KeyValueStore;
  session: KeyValueStore;
  navigate(path: string): void;
  log?(message: string): void;
  findTimeoutMs?: number;
}

interface Progress {
  tourId: string;
  version: number;
  stepIndex: number;
}

interface Active {
  tour: PublicTour;
  index: number;
  ui: TourUI;
  abort: AbortController;
  /** Set while navigating to another page for the current step (cross-page Next/Back). */
  pendingDirection: 1 | -1 | null;
}

const currentPath = () => normalizePathname(location.pathname);
const onThisPage = (pageUrl: string) => normalizePathname(pageUrl) === currentPath();

/**
 * Runs tours: decides eligibility, shows steps, handles navigation across pages and SPA route
 * changes, persists progress, and records analytics. Every public method is exception-safe.
 */
export class TourEngine {
  private active: Active | null = null;
  private tours: PublicTour[] = [];
  private toursPath: string | null = null;
  private generation = 0;

  constructor(private readonly deps: EngineDeps) {}

  /** Called on load and on every URL change. */
  async evaluate(): Promise<void> {
    const gen = ++this.generation;
    try {
      const path = currentPath();
      if (this.toursPath !== path) {
        this.tours = await this.deps.loadTours(path);
        this.toursPath = path;
      }
      if (gen !== this.generation) return;

      const progress = readJson<Progress>(this.deps.session, "active");
      if (this.active) {
        const { tour, index, pendingDirection } = this.active;
        if (onThisPage(tour.steps[index]!.pageUrl)) {
          // Arrived on the page of a step we navigated to (in-app navigation keeps the script alive).
          if (pendingDirection) {
            this.active.pendingDirection = null;
            this.safeShow(index, pendingDirection);
          }
          return;
        }
        // The visitor navigated themselves, typically by clicking what the step pointed at.
        const next = tour.steps[index + 1];
        if (next && onThisPage(next.pageUrl)) return this.safeShow(index + 1, 1);
        this.active.ui.hide();
        return;
      }
      if (progress) {
        const tour = this.tours.find((t) => t.id === progress.tourId);
        if (!tour || tour.version !== progress.version) {
          this.deps.session.remove("active");
        } else {
          const at = [progress.stepIndex, progress.stepIndex + 1].find(
            (i) => tour.steps[i] && onThisPage(tour.steps[i]!.pageUrl),
          );
          if (at !== undefined) return void this.begin(tour, at, false);
          return; // in progress, but not on this page
        }
      }
      const eligible = this.tours.find(
        (t) =>
          t.triggerType === "AUTO" &&
          t.steps.length > 0 &&
          !this.deps.local.get(`seen:${t.id}`) &&
          matchPathPattern(t.startUrl, currentPath()) &&
          onThisPage(t.steps[0]!.pageUrl),
      );
      if (eligible) this.begin(eligible, 0, true);
    } catch (err) {
      this.deps.log?.(`evaluate failed: ${String(err)}`);
    }
  }

  /** window.ProductTour.start(tourId): starts any published tour, even if seen before. */
  async start(tourId: string): Promise<boolean> {
    try {
      if (this.toursPath !== currentPath()) {
        this.tours = await this.deps.loadTours(currentPath());
        this.toursPath = currentPath();
      }
      const tour = this.tours.find((t) => t.id === tourId);
      if (!tour || !tour.steps.length) {
        this.deps.log?.(`tour ${tourId} is not available on this page`);
        return false;
      }
      this.end();
      if (!onThisPage(tour.steps[0]!.pageUrl)) {
        this.track(tour, "tour_started");
        this.saveProgress(tour, 0);
        this.deps.analytics.flush(true);
        this.deps.navigate(tour.steps[0]!.pageUrl);
        return true;
      }
      this.begin(tour, 0, true);
      return true;
    } catch (err) {
      this.deps.log?.(`start failed: ${String(err)}`);
      return false;
    }
  }

  /** window.ProductTour.stop(): closes the tour without recording a skip. */
  stop() {
    this.end();
  }

  /** window.ProductTour.reset(): forgets completed/skipped tours and progress for this visitor. */
  reset() {
    for (const t of this.tours) this.deps.local.remove(`seen:${t.id}`);
    this.deps.session.remove("active");
  }

  get isActive() {
    return this.active !== null;
  }

  /** The UI shadow root while a tour is showing (for tests). */
  get shadowRoot(): ShadowRoot | null {
    return this.active?.ui.shadow ?? null;
  }

  private begin(tour: PublicTour, index: number, fresh: boolean) {
    const ui = new TourUI({
      onNext: () => this.guard(() => this.next()),
      onBack: () => this.guard(() => this.back()),
      onSkip: () => this.guard(() => this.skip()),
    });
    ui.hide();
    this.active = { tour, index, ui, abort: new AbortController(), pendingDirection: null };
    if (fresh) this.track(tour, "tour_started");
    this.safeShow(index, 1);
  }

  private safeShow(index: number, direction: 1 | -1) {
    this.showStep(index, direction).catch((err: unknown) => this.fail(err));
  }

  private guard(fn: () => void) {
    try {
      fn();
    } catch (err) {
      this.fail(err);
    }
  }

  /** Shows step `index`; if its element is missing, moves on in `direction`. */
  private async showStep(index: number, direction: 1 | -1): Promise<void> {
    const a = this.active;
    if (!a) return;
    a.abort.abort();
    a.abort = new AbortController();
    const { signal } = a.abort;
    const step = a.tour.steps[index];
    if (!step) return this.end();
    a.index = index;
    this.saveProgress(a.tour, index);
    a.ui.hide();

    const found: FindResult = await findElement(step.cssSelector, {
      signal,
      timeoutMs: this.deps.findTimeoutMs ?? 5000,
    });
    if (signal.aborted || this.active !== a) return;
    if (!found.element) {
      this.track(a.tour, "element_not_found", index, found.reason);
      const fallback = index + direction;
      if (a.tour.steps[fallback] && onThisPage(a.tour.steps[fallback]!.pageUrl))
        return this.showStep(fallback, direction);
      return this.end(); // nothing left to show here: end gracefully
    }
    if (!isInViewport(found.element)) {
      const smooth = !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      found.element.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: smooth ? "smooth" : "auto",
      });
    }
    a.ui.show(found.element, { step, index, total: a.tour.steps.length });
    this.track(a.tour, "step_viewed", index);
  }

  private next() {
    const a = this.active;
    if (!a) return;
    this.track(a.tour, "next_clicked", a.index);
    if (a.index >= a.tour.steps.length - 1) {
      this.track(a.tour, "tour_completed");
      this.deps.local.set(`seen:${a.tour.id}`, "completed");
      return this.end();
    }
    this.go(a, a.index + 1, 1);
  }

  private back() {
    const a = this.active;
    if (!a || a.index === 0) return;
    this.track(a.tour, "back_clicked", a.index);
    this.go(a, a.index - 1, -1);
  }

  private go(a: Active, index: number, direction: 1 | -1) {
    const target = a.tour.steps[index]!;
    if (onThisPage(target.pageUrl)) return this.safeShow(index, direction);
    // Cross-page step: persist progress, flush analytics, then navigate (approved decision 11).
    a.index = index;
    a.pendingDirection = direction;
    this.saveProgress(a.tour, index);
    this.deps.analytics.flush(true);
    a.ui.hide();
    this.deps.navigate(target.pageUrl);
  }

  private skip() {
    const a = this.active;
    if (!a) return;
    this.track(a.tour, "tour_skipped", a.index);
    this.deps.local.set(`seen:${a.tour.id}`, "skipped");
    this.end();
  }

  /** Removes all UI and clears progress. */
  private end() {
    const a = this.active;
    if (!a) return;
    this.active = null;
    a.abort.abort();
    a.ui.destroy();
    this.deps.session.remove("active");
  }

  private saveProgress(tour: PublicTour, stepIndex: number) {
    this.deps.session.set(
      "active",
      JSON.stringify({ tourId: tour.id, version: tour.version, stepIndex } satisfies Progress),
    );
  }

  private track(
    tour: PublicTour,
    eventName: TrackInput["eventName"],
    stepIndex?: number,
    errorCode?: string,
  ) {
    const step = stepIndex !== undefined ? tour.steps[stepIndex] : undefined;
    this.deps.analytics.track({
      eventName,
      tourId: tour.id,
      tourVersion: tour.version,
      ...(step ? { stepId: step.id, stepOrder: step.stepOrder } : {}),
      ...(errorCode ? { errorCode } : {}),
    });
  }

  /** Full teardown (used by ProductTour.stop and on fatal errors). */
  destroy() {
    this.generation++;
    this.end();
  }

  /** Records an unexpected failure and removes the UI. */
  fail(err: unknown) {
    const a = this.active;
    if (a) this.track(a.tour, "tour_error", a.index, "runtime_error");
    this.deps.log?.(`tour error: ${String(err)}`);
    this.end();
  }
}
