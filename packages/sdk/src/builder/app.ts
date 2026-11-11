import { PLACEMENTS } from "@waypoint/shared/enums";
import type { PublishIssue } from "@waypoint/shared/publish-rules";
import { normalizePathname } from "@waypoint/shared/url";
import { navigateTo } from "../navigate";
import { TourEngine } from "../runtime/engine";
import type { KeyValueStore } from "../storage";
import { keepAttached } from "../ui/keep-attached";
import { watchUrl } from "../url/watch";
import {
  BuilderApiError,
  BuilderClient,
  toPublicTour,
  type BuilderStep,
  type BuilderTour,
  type BuilderTourSummary,
  type StepInput,
} from "./api";
import { h } from "./dom";
import { Picker } from "./picker";
import { generateSelector, matchSummary, type SelectorQuality } from "./selector";
import { BUILDER_STYLES } from "./styles";
import { extractPass, redeemAndStore, storedToken, takePassFromUrl } from "./token";

type View = "loading" | "locked" | "home" | "newTour" | "step" | "picking" | "preview";

interface StepForm {
  stepId: string | null;
  element: Element | null;
  selector: string;
  quality: SelectorQuality | null;
  reasons: string[];
  values: Omit<StepInput, "cssSelector" | "stepOrder">;
  errors: Record<string, string>;
}

const currentPath = () => normalizePathname(location.pathname);
const QUALITY_TEXT: Record<SelectorQuality, string> = {
  stable: "Stable",
  good: "OK",
  fragile: "Fragile",
};

const compact = <T>(items: (T | null | false)[]): T[] =>
  items.filter((n): n is T => n !== null && n !== false);

function memoryStore(): KeyValueStore {
  const m = new Map<string, string>();
  return {
    get: (k) => m.get(k) ?? null,
    set: (k, v) => void m.set(k, v),
    remove: (k) => void m.delete(k),
  };
}

/**
 * The on-site visual builder: authenticates with a builder code, lists tours and steps, picks
 * elements, saves steps, reorders, previews and publishes. Runs in its own shadow root.
 */
export class BuilderApp {
  private readonly host: HTMLElement;
  private readonly root: ShadowRoot;
  private readonly panel: HTMLDivElement;
  private readonly body: HTMLDivElement;
  private readonly title: HTMLSpanElement;
  private readonly status: HTMLDivElement;
  private banner: HTMLDivElement | null = null;
  private readonly picker: Picker;
  private client: BuilderClient | null = null;
  private view: View = "loading";
  private readOnly = false;
  private projectName = "";
  private tours: BuilderTourSummary[] = [];
  private tour: BuilderTour | null = null;
  private issues: PublishIssue[] = [];
  private form: StepForm | null = null;
  private minimized = false;
  private stopPreview: (() => void) | null = null;
  private readonly reposition = () => this.form && this.picker.outline(this.form.element);
  private readonly release: () => void;

  constructor(
    private readonly apiBase: string,
    private readonly session: KeyValueStore,
    private readonly preferTourId: string | null = null,
  ) {
    this.host = h("div", { "data-ptour-builder": "" });
    this.root = this.host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = BUILDER_STYLES;
    this.title = h("span", { className: "t" }, "Waypoint builder");
    this.body = h("div", { className: "body" });
    this.status = h("div", { className: "status", role: "status", "aria-live": "polite" });
    this.panel = h(
      "div",
      { className: "panel", role: "dialog", "aria-label": "Waypoint tour builder" },
      h(
        "div",
        { className: "head" },
        this.title,
        h(
          "button",
          {
            className: "icon",
            type: "button",
            title: "Move panel to the other side",
            "aria-label": "Move panel",
            onclick: () => this.panel.classList.toggle("left"),
          },
          "⇆",
        ),
        h(
          "button",
          {
            className: "icon",
            type: "button",
            title: "Minimise",
            "aria-label": "Minimise builder",
            onclick: () => this.toggleMin(),
          },
          "–",
        ),
        h(
          "button",
          {
            className: "icon",
            type: "button",
            title: "Close builder",
            "aria-label": "Close builder",
            onclick: () => this.destroy(),
          },
          "×",
        ),
      ),
      this.body,
    );
    this.root.append(style, this.panel);
    this.picker = new Picker(this.root, (t) => t === this.host);
    // Keep typing inside the builder from triggering the host page's keyboard shortcuts.
    for (const type of ["keydown", "keyup", "keypress"])
      this.host.addEventListener(type, (e) => e.stopPropagation());
    document.documentElement.appendChild(this.host);
    this.release = keepAttached(this.host);
    window.addEventListener("scroll", this.reposition, true);
    window.addEventListener("resize", this.reposition);
  }

  async start() {
    this.render();
    try {
      const fromUrl = takePassFromUrl();
      if (fromUrl) await redeemAndStore(this.apiBase, fromUrl, this.session);
    } catch (err) {
      return this.lock(this.errorText(err));
    }
    const token = storedToken(this.session);
    if (!token) return this.lock();
    this.client = new BuilderClient(this.apiBase, token.token);
    this.readOnly = token.mode !== "BUILD";
    await this.loadSession(token.tourId ?? this.preferTourId);
  }

  destroy() {
    this.stopPreview?.();
    this.picker.stop();
    window.removeEventListener("scroll", this.reposition, true);
    window.removeEventListener("resize", this.reposition);
    this.banner?.remove();
    this.release();
    this.host.remove();
    window.__ptourBuilderActive = false;
  }

  // ---------------------------------------------------------------- data

  private async loadSession(selectTourId: string | null) {
    try {
      const s = await this.client!.session();
      this.projectName = s.project.name;
      this.tours = s.tours;
      const id =
        selectTourId && s.tours.some((t) => t.id === selectTourId)
          ? selectTourId
          : (this.tour?.id ?? s.tours[0]?.id ?? null);
      if (id) await this.loadTour(id, false);
      else this.tour = null;
      this.say("");
      this.go("home");
    } catch (err) {
      this.handleError(err);
    }
  }

  private async loadTour(id: string, render = true) {
    const r = await this.client!.getTour(id);
    this.tour = r.tour;
    this.issues = r.publishIssues;
    const summary = this.tours.find((t) => t.id === id);
    if (summary) summary.status = r.tour.status;
    if (render) this.render();
  }

  private handleError(err: unknown) {
    if (
      err instanceof BuilderApiError &&
      (err.code === "BUILDER_PASS_INVALID" || err.status === 401)
    ) {
      this.session.remove("builder");
      return this.lock("Your builder code has expired. Get a new one from the dashboard.");
    }
    this.say(this.errorText(err), true);
  }

  private errorText(err: unknown) {
    if (err instanceof BuilderApiError) return err.message;
    return "Couldn't reach Waypoint. Check your connection and that this site is in the project's allowed origins.";
  }

  // ---------------------------------------------------------------- view helpers

  private go(view: View) {
    this.view = view;
    this.render();
  }

  private lock(message?: string) {
    this.lockMessage = message ?? null;
    this.go("locked");
  }
  private lockMessage: string | null = null;

  private say(message: string, isError = false) {
    this.status.textContent = message;
    this.status.style.color = isError ? "#b91c1c" : "";
  }

  private toggleMin() {
    this.minimized = !this.minimized;
    this.panel.classList.toggle("min", this.minimized);
    this.body.style.display = this.minimized ? "none" : "";
  }

  private showBanner(text: string, actionLabel: string, action: () => void) {
    this.banner?.remove();
    this.banner = h(
      "div",
      { className: "banner", role: "status" },
      text,
      h("button", { className: "btn small", type: "button", onclick: action }, actionLabel),
    );
    this.root.append(this.banner);
  }

  private hideBanner() {
    this.banner?.remove();
    this.banner = null;
  }

  // ---------------------------------------------------------------- rendering

  private render() {
    this.title.replaceChildren(
      "Waypoint builder",
      this.projectName ? h("span", { className: "sub" }, ` · ${this.projectName}`) : "",
    );
    this.panel.style.display = this.view === "preview" ? "none" : "";
    const content =
      this.view === "loading"
        ? [h("p", { className: "muted" }, "Connecting…")]
        : this.view === "locked"
          ? this.renderLocked()
          : this.view === "newTour"
            ? this.renderNewTour()
            : this.view === "step" || this.view === "picking"
              ? this.renderStepForm()
              : this.renderHome();
    this.body.replaceChildren(...content, this.status);
  }

  private renderLocked(): Node[] {
    const input = h("input", {
      id: "code",
      className: "mono",
      placeholder: "wpb_… or the full builder link",
      autocomplete: "off",
      spellcheck: "false",
    });
    const connect = async () => {
      const pass = extractPass(input.value);
      if (!pass)
        return this.say(
          "That doesn't look like a builder code. Copy it again from the dashboard.",
          true,
        );
      this.say("Connecting…");
      try {
        await redeemAndStore(this.apiBase, pass, this.session);
        await this.start();
      } catch (err) {
        this.say(this.errorText(err), true);
      }
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") void connect();
    });
    queueMicrotask(() => input.focus());
    return compact<Node>([
      this.lockMessage ? h("div", { className: "note err" }, this.lockMessage) : null,
      h(
        "p",
        {},
        "Paste the builder code from your Waypoint dashboard (tour page → Open visual builder).",
      ),
      h("label", { for: "code" }, "Builder code", input),
      h(
        "button",
        { className: "btn primary", type: "button", onclick: () => void connect() },
        "Connect",
      ),
      h(
        "p",
        { className: "muted" },
        "Codes work once, on this website only, and stay valid for 2 hours.",
      ),
    ]);
  }

  private renderHome(): Node[] {
    const nodes: Node[] = [];
    if (this.readOnly)
      nodes.push(
        h(
          "div",
          { className: "note warn" },
          "Preview-only code: you can play tours but not edit them.",
        ),
      );

    const select = h(
      "select",
      {
        id: "tour",
        "aria-label": "Tour",
        onchange: (e: Event) => void this.selectTour((e.target as HTMLSelectElement).value),
      },
      ...this.tours.map((t) =>
        h(
          "option",
          { value: t.id, ...(t.id === this.tour?.id ? { selected: true } : {}) },
          `${t.name}${t.status === "PUBLISHED" ? " ✓" : ""}`,
        ),
      ),
      ...(this.readOnly ? [] : [h("option", { value: "__new" }, "+ New tour…")]),
    );
    if (!this.tours.length && !this.readOnly)
      return [
        ...nodes,
        h("p", {}, "No tours yet in this project."),
        h(
          "button",
          { className: "btn primary", type: "button", onclick: () => this.go("newTour") },
          "Create a tour on this page",
        ),
      ];
    nodes.push(h("label", { for: "tour" }, "Tour", select));

    const t = this.tour;
    if (!t) return nodes;
    nodes.push(
      h(
        "div",
        { className: "row" },
        h(
          "span",
          { className: `badge ${t.status}` },
          t.status === "PUBLISHED" ? "Published" : t.status === "DRAFT" ? "Draft" : "Archived",
        ),
        h("span", { className: "muted grow" }, `starts on ${t.startUrl}`),
        h(
          "button",
          {
            className: "btn small",
            type: "button",
            onclick: () => this.preview(),
            disabled: !t.steps.length,
          },
          "▶ Preview",
        ),
        this.readOnly || t.status === "ARCHIVED"
          ? null
          : h(
              "button",
              {
                className: `btn small ${t.status === "PUBLISHED" ? "" : "primary"}`,
                type: "button",
                onclick: () => void this.togglePublish(),
              },
              t.status === "PUBLISHED" ? "Unpublish" : "Publish",
            ),
      ),
    );
    if (this.issues.length && t.status !== "PUBLISHED")
      nodes.push(
        h(
          "div",
          { className: "note warn" },
          "Before publishing:",
          h("ul", {}, ...this.issues.map((i) => h("li", {}, i.message))),
        ),
      );

    const list = h("ol", { className: "steps", "aria-label": "Steps" });
    t.steps.forEach((s, i) => list.append(this.renderStepRow(s, i, t.steps.length)));
    if (t.steps.length) nodes.push(list);
    else nodes.push(h("p", { className: "muted" }, "No steps yet. Add the first one below."));
    if (!this.readOnly)
      nodes.push(
        h(
          "button",
          { className: "btn primary", type: "button", onclick: () => this.beginPick(null) },
          "+ Add step: select an element",
        ),
      );
    return nodes;
  }

  private renderStepRow(s: BuilderStep, i: number, total: number) {
    const elsewhere = normalizePathname(s.pageUrl) !== currentPath();
    return h(
      "li",
      { className: "step" },
      h("span", { className: "num", "aria-hidden": "true" }, String(i + 1)),
      h(
        "div",
        { className: "txt" },
        h("div", { className: "ttl" }, s.title || s.description || `Step ${i + 1}`),
        h("div", { className: "meta" }, `${elsewhere ? "↗ " : ""}${s.pageUrl} · ${s.cssSelector}`),
      ),
      ...(this.readOnly
        ? []
        : [
            h(
              "button",
              {
                className: "mini",
                type: "button",
                "aria-label": `Move step ${i + 1} up`,
                disabled: i === 0,
                onclick: () => void this.move(i, -1),
              },
              "▲",
            ),
            h(
              "button",
              {
                className: "mini",
                type: "button",
                "aria-label": `Move step ${i + 1} down`,
                disabled: i === total - 1,
                onclick: () => void this.move(i, 1),
              },
              "▼",
            ),
            h(
              "button",
              {
                className: "mini",
                type: "button",
                "aria-label": `Edit step ${i + 1}`,
                onclick: () => this.editStep(s),
              },
              "✎",
            ),
            h(
              "button",
              {
                className: "mini",
                type: "button",
                "aria-label": `Delete step ${i + 1}`,
                onclick: () => void this.deleteStep(s, i),
              },
              "🗑",
            ),
          ]),
    );
  }

  private renderNewTour(): Node[] {
    const name = h("input", { id: "tname", placeholder: "e.g. Welcome tour", maxlength: "120" });
    const start = h("input", { id: "tstart", className: "mono", value: currentPath() });
    const trigger = h(
      "select",
      { id: "ttrigger" },
      h("option", { value: "AUTO" }, "Automatic (once per visitor)"),
      h("option", { value: "MANUAL" }, "Manual (ProductTour.start)"),
    );
    queueMicrotask(() => name.focus());
    const create = async () => {
      try {
        const { tour } = await this.client!.createTour({
          name: name.value,
          startUrl: start.value,
          triggerType: trigger.value as "AUTO" | "MANUAL",
        });
        this.tours.unshift({ id: tour.id, name: tour.name, status: tour.status });
        await this.loadTour(tour.id, false);
        this.say("Tour created. Now add steps.");
        this.go("home");
      } catch (err) {
        this.say(this.errorText(err), true);
      }
    };
    return [
      h("strong", {}, "New tour"),
      h("label", { for: "tname" }, "Name", name),
      h("label", { for: "tstart" }, "Starts on page", start),
      h("label", { for: "ttrigger" }, "Trigger", trigger),
      h(
        "div",
        { className: "row" },
        h(
          "button",
          { className: "btn primary", type: "button", onclick: () => void create() },
          "Create tour",
        ),
        h("button", { className: "btn", type: "button", onclick: () => this.go("home") }, "Cancel"),
      ),
    ];
  }

  private renderStepForm(): Node[] {
    const f = this.form!;
    if (this.view === "picking") {
      return [
        h("p", {}, "Click the element this step should point at."),
        h(
          "p",
          { className: "muted" },
          "Links and buttons won't activate while selecting. Press Esc to cancel.",
        ),
        h(
          "button",
          { className: "btn", type: "button", onclick: () => this.cancelPick() },
          "Cancel",
        ),
      ];
    }
    const err = (k: string) =>
      f.errors[k] ? h("span", { className: "err-text" }, f.errors[k]!) : null;
    const selector = h("input", {
      id: "sel",
      className: "mono",
      value: f.selector,
      spellcheck: "false",
    });
    const matchInfo = h("span", { className: "muted" });
    const updateMatch = () => {
      const m = matchSummary(selector.value);
      const hidden = m ? m.total - m.visible : 0;
      const ok = m !== null && m.visible === 1;
      matchInfo.textContent = !m
        ? "Not a valid selector"
        : m.total === 0
          ? "Matches nothing on this page"
          : m.visible === 0
            ? "Matches only hidden elements"
            : m.visible === 1
              ? `Matches 1 visible element ✓${hidden ? ` (+${hidden} hidden)` : ""}`
              : `Matches ${m.visible} visible elements: the first one will be used`;
      matchInfo.style.color = ok ? "#166534" : "#b45309";
    };
    selector.addEventListener("input", () => {
      f.selector = selector.value;
      f.quality = null;
      try {
        f.element = document.querySelector(selector.value);
      } catch {
        f.element = null;
      }
      this.picker.outline(f.element);
      updateMatch();
    });
    updateMatch();
    const v = f.values;
    const input = (id: keyof typeof v, props: Record<string, string> = {}) => {
      const el = h("input", { id, value: String(v[id]), ...props });
      el.addEventListener("input", () => ((v as unknown as Record<string, string>)[id] = el.value));
      return el;
    };
    const desc = h("textarea", { id: "description", maxlength: "1000" }, v.description);
    desc.addEventListener("input", () => (v.description = desc.value));
    const placement = h(
      "select",
      {
        id: "placement",
        onchange: (e: Event) =>
          (v.placement = (e.target as HTMLSelectElement).value as StepInput["placement"]),
      },
      ...PLACEMENTS.map((p) =>
        h(
          "option",
          { value: p, ...(p === v.placement ? { selected: true } : {}) },
          p === "AUTO" ? "Auto (best fit)" : p[0] + p.slice(1).toLowerCase(),
        ),
      ),
    );
    const skip = h("input", {
      id: "allowSkip",
      type: "checkbox",
      checked: v.allowSkip,
      onchange: (e: Event) => (v.allowSkip = (e.target as HTMLInputElement).checked),
    });

    return compact<Node>([
      h("strong", {}, f.stepId ? "Edit step" : `New step ${(this.tour?.steps.length ?? 0) + 1}`),
      h(
        "label",
        { for: "sel" },
        h(
          "span",
          { className: "row" },
          "Element ",
          f.quality
            ? h("span", { className: `badge ${f.quality}` }, QUALITY_TEXT[f.quality])
            : null,
        ),
        selector,
      ),
      h(
        "div",
        { className: "row" },
        matchInfo,
        h(
          "button",
          { className: "btn small", type: "button", onclick: () => this.beginPick(f) },
          "Select again",
        ),
      ),
      f.quality === "fragile" || f.reasons.length
        ? h(
            "div",
            { className: `note ${f.quality === "fragile" ? "warn" : ""}` },
            f.reasons.join(". "),
            f.quality === "fragile"
              ? ". For a reliable tour, ask the site team to add a data-tour-id attribute to this element."
              : "",
          )
        : null,
      err("cssSelector"),
      h(
        "label",
        { for: "title" },
        "Title",
        input("title", { maxlength: "120", placeholder: "Short heading" }),
      ),
      err("title"),
      h("label", { for: "description" }, "Description", desc),
      err("description"),
      h(
        "div",
        { className: "row" },
        h("label", { for: "placement", className: "grow" }, "Placement", placement),
        h(
          "label",
          { for: "pageUrl", className: "grow" },
          "Page",
          input("pageUrl", { className: "mono" }),
        ),
      ),
      err("pageUrl"),
      h(
        "div",
        { className: "row" },
        h(
          "label",
          { for: "nextButtonLabel", className: "grow" },
          "Next button",
          input("nextButtonLabel", { maxlength: "30" }),
        ),
        h(
          "label",
          { for: "backButtonLabel", className: "grow" },
          "Back button",
          input("backButtonLabel", { maxlength: "30" }),
        ),
      ),
      h("label", { className: "check" }, skip, "Allow visitors to skip the tour on this step"),
      h(
        "div",
        { className: "row" },
        h(
          "button",
          { className: "btn primary", type: "button", onclick: () => void this.saveStep() },
          "Save step",
        ),
        h(
          "button",
          { className: "btn", type: "button", onclick: () => this.closeForm() },
          "Cancel",
        ),
      ),
    ]);
  }

  // ---------------------------------------------------------------- actions

  private async selectTour(id: string) {
    if (id === "__new") return this.go("newTour");
    try {
      await this.loadTour(id);
    } catch (err) {
      this.handleError(err);
    }
  }

  private beginPick(existing: StepForm | null) {
    if (!this.tour) return;
    this.form = existing ?? {
      stepId: null,
      element: null,
      selector: "",
      quality: null,
      reasons: [],
      values: {
        pageUrl: currentPath(),
        title: "",
        description: "",
        placement: "AUTO",
        nextButtonLabel: "Next",
        backButtonLabel: "Back",
        allowSkip: true,
      },
      errors: {},
    };
    this.go("picking");
    this.showBanner("Click any element to select it · Esc cancels", "Cancel", () =>
      this.cancelPick(),
    );
    this.picker.start(
      (el) => {
        this.hideBanner();
        const r = generateSelector(el);
        Object.assign(this.form!, {
          element: el,
          selector: r.selector,
          quality: r.quality,
          reasons: r.reasons,
        });
        this.picker.outline(el);
        this.go("step");
      },
      () => this.cancelPick(),
    );
  }

  private cancelPick() {
    this.picker.stop();
    this.hideBanner();
    if (this.form?.selector) this.go("step");
    else this.closeForm();
  }

  private editStep(s: BuilderStep) {
    let element: Element | null = null;
    try {
      element = document.querySelector(s.cssSelector);
    } catch {
      element = null;
    }
    this.form = {
      stepId: s.id,
      element,
      selector: s.cssSelector,
      quality: null,
      reasons: [],
      values: {
        pageUrl: s.pageUrl,
        title: s.title,
        description: s.description,
        placement: s.placement,
        nextButtonLabel: s.nextButtonLabel,
        backButtonLabel: s.backButtonLabel,
        allowSkip: s.allowSkip,
      },
      errors: {},
    };
    this.picker.outline(element);
    this.go("step");
  }

  private closeForm() {
    this.form = null;
    this.picker.hideBox();
    this.go("home");
  }

  private async saveStep() {
    const f = this.form!;
    const t = this.tour!;
    const input: StepInput = { ...f.values, cssSelector: f.selector };
    try {
      if (f.stepId) await this.client!.updateStep(f.stepId, input);
      else await this.client!.createStep(t.id, input);
      await this.loadTour(t.id, false);
      this.closeForm();
      this.say(f.stepId ? "Step updated." : "Step added. Add another, preview, or publish.");
    } catch (err) {
      if (err instanceof BuilderApiError && err.details.length) {
        f.errors = err.fieldErrors();
        this.render();
        this.say(err.message, true);
      } else this.handleError(err);
    }
  }

  private async move(index: number, delta: -1 | 1) {
    const t = this.tour!;
    const ids = t.steps.map((s) => s.id);
    const j = index + delta;
    [ids[index], ids[j]] = [ids[j]!, ids[index]!];
    try {
      await this.client!.reorder(t.id, ids);
      await this.loadTour(t.id);
      this.say(`Moved to position ${j + 1}.`);
    } catch (err) {
      this.handleError(err);
    }
  }

  private async deleteStep(s: BuilderStep, i: number) {
    if (
      !window.confirm(
        `Delete step ${i + 1}${s.title ? ` "${s.title}"` : ""}? This can't be undone.`,
      )
    )
      return;
    try {
      await this.client!.deleteStep(s.id);
      await this.loadTour(this.tour!.id);
      this.say("Step deleted.");
    } catch (err) {
      this.handleError(err);
    }
  }

  private async togglePublish() {
    const t = this.tour!;
    const publishing = t.status !== "PUBLISHED";
    try {
      await this.client!.setPublished(t.id, publishing);
      await this.loadTour(t.id);
      this.say(
        publishing
          ? "Published. Visitors will see this tour once the snippet is on the site."
          : "Unpublished.",
      );
    } catch (err) {
      if (err instanceof BuilderApiError && err.code === "PUBLISH_VALIDATION_FAILED") {
        this.issues = err.details as unknown as PublishIssue[];
        this.render();
        this.say("Fix the items above, then publish.", true);
      } else this.handleError(err);
    }
  }

  /** Plays the current (draft) tour with the real runtime, without recording analytics. */
  private preview() {
    const t = this.tour;
    if (!t?.steps.length) return;
    const draft = toPublicTour(t);
    const engine = new TourEngine({
      loadTours: async () => [draft],
      analytics: { track: () => {}, flush: () => {} },
      local: memoryStore(),
      session: memoryStore(),
      navigate: navigateTo,
    });
    const stopWatching = watchUrl(() => void engine.evaluate());
    this.go("preview");
    const end = () => {
      clearInterval(poll);
      stopWatching();
      engine.destroy();
      this.hideBanner();
      this.stopPreview = null;
      this.go("home");
    };
    this.stopPreview = end;
    this.showBanner(`Previewing "${t.name}" · not recorded in analytics`, "Stop preview", end);
    let started = false;
    const poll = setInterval(() => {
      if (engine.isActive) started = true;
      else if (started) end();
    }, 400);
    void engine.start(t.id).then((ok) => {
      if (!ok) {
        end();
        this.say(
          `Step 1 is on ${draft.steps[0]!.pageUrl}. Open that page and preview again.`,
          true,
        );
      }
    });
  }
}
