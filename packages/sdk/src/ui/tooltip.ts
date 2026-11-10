import type { PublicTourStep } from "@waypoint/shared/api-types";
import {
  arrow,
  autoPlacement,
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  type Placement,
} from "@floating-ui/dom";
import { STYLES } from "./styles";

export interface TooltipActions {
  onNext(): void;
  onBack(): void;
  onSkip(): void;
}

export interface TooltipView {
  step: PublicTourStep;
  index: number;
  total: number;
}

const PLACEMENT: Record<string, Placement | null> = {
  TOP: "top",
  BOTTOM: "bottom",
  LEFT: "left",
  RIGHT: "right",
  AUTO: null,
};
const HIGHLIGHT_PADDING = 6;
let uid = 0;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  // Plain text only (approved decision 9). Content is never parsed as HTML.
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * Renders the overlay, highlight and tooltip inside a single shadow-DOM host attached to
 * <html>. Nothing else in the host page is modified. `destroy()` removes every node and
 * listener it created and restores focus.
 */
export class TourUI {
  private readonly host: HTMLElement;
  private readonly root: ShadowRoot;
  private readonly highlight: HTMLDivElement;
  private tooltip: HTMLDivElement | null = null;
  private stopAutoUpdate: (() => void) | null = null;
  private readonly previousFocus: Element | null;
  private readonly onKeyDown = (e: KeyboardEvent) => this.handleKey(e);

  constructor(private readonly actions: TooltipActions) {
    this.previousFocus = document.activeElement;
    this.host = document.createElement("div");
    this.host.setAttribute("data-ptour-host", "");
    this.root = this.host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = STYLES;
    this.highlight = el("div", "highlight");
    this.highlight.setAttribute("aria-hidden", "true");
    this.root.append(style, this.highlight);
    document.documentElement.appendChild(this.host);
    window.addEventListener("keydown", this.onKeyDown, true);
  }

  /** The shadow root (exposed for tests). */
  get shadow(): ShadowRoot {
    return this.root;
  }

  show(target: Element, view: TooltipView) {
    this.stopAutoUpdate?.();
    this.tooltip?.remove();
    const { step, index, total } = view;
    const isFirst = index === 0;
    const isLast = index === total - 1;
    const id = `ptour-${++uid}`;

    const tip = el("div", "tooltip");
    tip.setAttribute("role", "dialog");
    tip.setAttribute("aria-modal", "true");
    tip.tabIndex = -1;
    const arrowEl = el("div", "arrow");

    const header = el("div", "header");
    const title = el("h2", "title", step.title || `Step ${index + 1}`);
    title.id = `${id}-title`;
    tip.setAttribute("aria-labelledby", title.id);
    const close = el("button", "close", "×");
    close.type = "button";
    close.setAttribute("aria-label", "Close tour");
    close.addEventListener("click", () => this.actions.onSkip());
    header.append(title, close);
    tip.append(arrowEl, header);

    if (step.description) {
      const body = el("p", "body", step.description);
      body.id = `${id}-desc`;
      tip.setAttribute("aria-describedby", body.id);
      tip.append(body);
    }

    const footer = el("div", "footer");
    const counter = el("span", "counter", `${index + 1} of ${total}`);
    counter.setAttribute("aria-live", "polite");
    footer.append(counter);
    if (step.allowSkip && !isLast)
      footer.append(this.button("Skip", "btn link", () => this.actions.onSkip()));
    if (!isFirst)
      footer.append(
        this.button(step.backButtonLabel || "Back", "btn", () => this.actions.onBack()),
      );
    const primary = this.button(
      isLast ? "Finish" : step.nextButtonLabel || "Next",
      "btn primary",
      () => this.actions.onNext(),
    );
    footer.append(primary);
    tip.append(footer);

    this.root.append(tip);
    this.tooltip = tip;

    const placement = PLACEMENT[step.placement] ?? null;
    const update = () => this.position(target, tip, arrowEl, placement);
    this.stopAutoUpdate = autoUpdate(target, tip, update, { animationFrame: false });
    primary.focus({ preventScroll: true });
  }

  private button(label: string, className: string, onClick: () => void) {
    const b = el("button", className, label);
    b.type = "button";
    b.addEventListener("click", onClick);
    return b;
  }

  private position(
    target: Element,
    tip: HTMLElement,
    arrowEl: HTMLElement,
    placement: Placement | null,
  ) {
    const r = target.getBoundingClientRect();
    Object.assign(this.highlight.style, {
      top: `${r.top - HIGHLIGHT_PADDING}px`,
      left: `${r.left - HIGHLIGHT_PADDING}px`,
      width: `${r.width + HIGHLIGHT_PADDING * 2}px`,
      height: `${r.height + HIGHLIGHT_PADDING * 2}px`,
    });
    const middleware = [
      offset(12 + HIGHLIGHT_PADDING),
      placement ? flip({ padding: 8 }) : autoPlacement({ padding: 8 }),
      shift({ padding: 8 }),
      arrow({ element: arrowEl }),
    ];
    void computePosition(target, tip, {
      strategy: "fixed",
      placement: placement ?? "bottom",
      middleware,
    }).then(({ x, y, placement: final, middlewareData }) => {
      Object.assign(tip.style, { left: `${x}px`, top: `${y}px` });
      const side = final.split("-")[0] as "top" | "bottom" | "left" | "right";
      const opposite = { top: "bottom", bottom: "top", left: "right", right: "left" }[side];
      const a = middlewareData.arrow;
      Object.assign(arrowEl.style, {
        left: a?.x != null ? `${a.x}px` : "",
        top: a?.y != null ? `${a.y}px` : "",
        right: "",
        bottom: "",
        [opposite]: "-6px",
      });
    });
  }

  /** Escape closes; Tab/Shift+Tab are kept inside the tooltip. */
  private handleKey(e: KeyboardEvent) {
    if (!this.tooltip) return;
    if (e.key === "Escape") {
      e.stopPropagation();
      this.actions.onSkip();
      return;
    }
    if (e.key !== "Tab") return;
    const focusables = Array.from(this.tooltip.querySelectorAll<HTMLElement>("button"));
    if (!focusables.length) return;
    const active = this.root.activeElement as HTMLElement | null;
    const idx = active ? focusables.indexOf(active) : -1;
    const next = e.shiftKey
      ? idx <= 0
        ? focusables.length - 1
        : idx - 1
      : idx === focusables.length - 1 || idx === -1
        ? 0
        : idx + 1;
    e.preventDefault();
    focusables[next]!.focus({ preventScroll: true });
  }

  /** Hides the tooltip but keeps the host (used while waiting for the next element). */
  hide() {
    this.stopAutoUpdate?.();
    this.stopAutoUpdate = null;
    this.tooltip?.remove();
    this.tooltip = null;
    Object.assign(this.highlight.style, {
      width: "0px",
      height: "0px",
      top: "-9999px",
      left: "-9999px",
    });
  }

  destroy() {
    this.hide();
    window.removeEventListener("keydown", this.onKeyDown, true);
    this.host.remove();
    const prev = this.previousFocus as HTMLElement | null;
    if (prev && prev.isConnected && typeof prev.focus === "function")
      prev.focus({ preventScroll: true });
  }
}
