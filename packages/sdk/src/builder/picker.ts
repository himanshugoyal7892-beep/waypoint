/**
 * Element picker: outlines elements under the pointer and captures one click.
 *
 * While picking, pointer and click events on the page are intercepted in the capture phase
 * (preventDefault + stopImmediatePropagation) so links and buttons don't fire. Events inside the
 * builder's own UI are ignored. Escape cancels. Nothing on the host page is modified: the outline
 * is drawn inside the builder's shadow root.
 */
export class Picker {
  private active = false;
  private current: Element | null = null;
  private readonly box: HTMLDivElement;
  private readonly label: HTMLDivElement;
  private onPick: ((el: Element) => void) | null = null;
  private onCancel: (() => void) | null = null;

  constructor(
    layer: ShadowRoot,
    private readonly isOwnUi: (target: EventTarget) => boolean,
  ) {
    this.box = document.createElement("div");
    this.box.className = "pick-box";
    this.label = document.createElement("div");
    this.label.className = "pick-label";
    this.box.append(this.label);
    layer.append(this.box);
    this.hideBox();
  }

  get isActive() {
    return this.active;
  }

  start(onPick: (el: Element) => void, onCancel: () => void) {
    this.stop();
    this.active = true;
    this.onPick = onPick;
    this.onCancel = onCancel;
    for (const type of BLOCKED)
      window.addEventListener(type, this.block, { capture: true, passive: false });
    window.addEventListener("pointermove", this.move, true);
    window.addEventListener("keydown", this.key, true);
    document.documentElement.style.setProperty("cursor", "crosshair", "important");
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    for (const type of BLOCKED) window.removeEventListener(type, this.block, { capture: true });
    window.removeEventListener("pointermove", this.move, true);
    window.removeEventListener("keydown", this.key, true);
    document.documentElement.style.removeProperty("cursor");
    this.current = null;
    this.hideBox();
  }

  /** Draws the outline around `el` (also used to show the selected element while editing). */
  outline(el: Element | null, text = "") {
    if (!el) return this.hideBox();
    const r = el.getBoundingClientRect();
    Object.assign(this.box.style, {
      display: "block",
      top: `${r.top - 3}px`,
      left: `${r.left - 3}px`,
      width: `${r.width + 6}px`,
      height: `${r.height + 6}px`,
    });
    this.label.textContent = text;
    this.label.style.display = text ? "block" : "none";
  }

  hideBox() {
    this.box.style.display = "none";
  }

  private targetFrom(e: Event): Element | null {
    const path = e.composedPath();
    if (path.some((t) => this.isOwnUi(t))) return null;
    const t = path[0];
    return t instanceof Element ? t : null;
  }

  private readonly move = (e: PointerEvent) => {
    const el = this.targetFrom(e);
    if (!el || el === this.current) return;
    this.current = el;
    this.outline(el, el.tagName.toLowerCase());
  };

  private readonly block = (e: Event) => {
    const el = this.targetFrom(e);
    if (!el) return; // let the builder UI work normally
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.type === "click") {
      const pick = this.onPick;
      this.stop();
      pick?.(el);
    }
  };

  private readonly key = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const cancel = this.onCancel;
    this.stop();
    cancel?.();
  };
}

const BLOCKED = [
  "pointerdown",
  "pointerup",
  "mousedown",
  "mouseup",
  "click",
  "dblclick",
  "auxclick",
  "contextmenu",
  "touchstart",
  "touchend",
  "submit",
] as const;
