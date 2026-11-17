import { generateSelector } from "./selector";

/**
 * Page scan for "Draft with AI": collects the visible elements a tour could point at, each with a
 * selector, its visible text or label and its rough position. Reads the page only; changes
 * nothing. Text from form fields is never read (only placeholders and labels), so nothing a
 * visitor typed is sent.
 */

export interface ScannedElement {
  selector: string;
  tag: string;
  text: string;
  label: string;
  role: string;
  y: number;
}

const CANDIDATES = [
  "a[href]",
  "button",
  "input:not([type=hidden])",
  "select",
  "textarea",
  "[role=button]",
  "[role=link]",
  "[role=tab]",
  "[role=search]",
  "[role=menuitem]",
  "[role=combobox]",
  "nav",
  "form",
  "h1",
  "h2",
  "[data-testid]",
  "[data-tour-id]",
  "[aria-label]",
].join(",");

const NOISE = /cookie|consent|gdpr|onetrust|cky-|chat-?widget|intercom|drift|hubspot/i;
const MAX_CANDIDATES = 400;
const MAX_RESULT = 120;

const clean = (s: string | null | undefined, n = 160) =>
  (s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

function visible(el: Element): DOMRect | null {
  const r = el.getBoundingClientRect();
  if (r.width < 8 || r.height < 8) return null;
  const cs = getComputedStyle(el);
  if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) return null;
  return r;
}

function inNoise(el: Element): boolean {
  for (let n: Element | null = el; n && n !== document.body; n = n.parentElement) {
    const id = n.id ?? "";
    const cls = typeof n.className === "string" ? n.className : "";
    if (NOISE.test(id) || NOISE.test(cls) || NOISE.test(n.getAttribute("aria-label") ?? ""))
      return true;
  }
  return false;
}

function textOf(el: Element): string {
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return ""; // never read values
  if (tag === "nav" || tag === "form") return clean((el as HTMLElement).innerText, 80);
  return clean((el as HTMLElement).innerText);
}

function labelOf(el: Element): string {
  return clean(
    el.getAttribute("aria-label") ||
      el.getAttribute("placeholder") ||
      el.getAttribute("alt") ||
      el.getAttribute("title") ||
      (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent) ||
      el.querySelector("img[alt]")?.getAttribute("alt") ||
      "",
  );
}

function priority(el: Element, r: DOMRect): number {
  let p = 0;
  if (el.hasAttribute("data-tour-id") || el.hasAttribute("data-testid")) p += 3;
  if (el.id) p += 1;
  if (/^(input|button|select|textarea|nav|form|h1)$/i.test(el.tagName)) p += 2;
  if (el.getAttribute("role") === "search" || el.getAttribute("type") === "search") p += 2;
  if (r.top < innerHeight) p += 1;
  return p;
}

/** `exclude` returns true for Waypoint's own UI (builder panel, tour tips). */
export function scanPage(exclude: (el: Element) => boolean): ScannedElement[] {
  const pageHeight = Math.max(document.documentElement.scrollHeight, innerHeight, 1);
  type Cand = { el: Element; r: DOMRect; p: number; text: string; label: string };
  // One candidate per visible text: nested wrappers (div > ul > li > span) and repeated items
  // (carousel clones, product cards) share text, so keep the best-ranked one.
  const byText = new Map<string, Cand>();

  for (const el of Array.from(document.querySelectorAll(CANDIDATES))) {
    if (byText.size >= MAX_CANDIDATES * 2) break;
    if (exclude(el) || el.closest("[data-ptour-host],[data-ptour-builder]")) continue;
    const r = visible(el);
    if (!r || inNoise(el)) continue;
    const text = textOf(el);
    const label = labelOf(el);
    if (!text && !label) continue;
    const key = (text || label).toLowerCase();
    const cand = { el, r, p: priority(el, r), text, label };
    const prev = byText.get(key);
    // Ties go to the inner element: it is the one a tip should point at.
    if (!prev || cand.p >= prev.p) byText.set(key, cand);
  }

  const picked = [...byText.values()].sort((a, b) => b.p - a.p).slice(0, MAX_CANDIDATES);
  const out: ScannedElement[] = [];
  const selectors = new Set<string>();
  for (const c of picked) {
    if (out.length >= MAX_RESULT) break;
    let sel: string;
    try {
      const res = generateSelector(c.el);
      if (res.quality === "fragile") continue;
      sel = res.selector;
    } catch {
      continue;
    }
    // Long positional paths break with the next site change: leave them out.
    if (!sel || sel.length > 120 || sel.split(">").length > 4 || selectors.has(sel)) continue;
    selectors.add(sel);
    out.push({
      selector: sel,
      tag: c.el.tagName.toLowerCase(),
      text: c.text,
      label: c.label,
      role: c.el.getAttribute("role") ?? "",
      y: Math.min(100, Math.max(0, ((c.r.top + scrollY) / pageHeight) * 100)),
    });
  }
  return out.sort((a, b) => a.y - b.y);
}
