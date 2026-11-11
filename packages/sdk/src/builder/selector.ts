/**
 * CSS selector generation for the element picker (Phase 1 §7).
 *
 * Priority: data-tour-id → stable id → stable data attribute (data-testid, …) → accessible
 * attribute (aria-label, alt, title, name) → tag + stable classes → anchored path → nth-of-type
 * path. Every candidate must match exactly one element. Values that look machine-generated
 * (CSS-in-JS hashes, framework ids) are never used.
 */

export type SelectorQuality = "stable" | "good" | "fragile";

export interface SelectorResult {
  selector: string;
  quality: SelectorQuality;
  reasons: string[];
}

const STABLE_DATA_ATTRS = [
  "data-testid",
  "data-test-id",
  "data-test",
  "data-cy",
  "data-qa",
  "data-id",
];

const GENERATED = [
  /^(css|sc|jsx|emotion|svelte|styled|chakra|mui|Mui|makeStyles)-/,
  /__[a-zA-Z0-9]{5}$/, // CSS-module hash suffix, e.g. Button__a1b2c
  /[_-](?=[a-z]*\d)[a-z0-9]{5,}$/i, // hash-like suffix containing a digit, e.g. card_x7f3k
  /\d{4,}/, // long numbers
  /[0-9a-f]{8,}/i, // hex-ish runs
  /^:r[0-9a-z]+:$/, // React useId
  /^(radix|headlessui|react-aria|mantine|ember|ext-gen)[-\d]/,
  /[[\]/:]/, // Tailwind arbitrary / variants
];

export function looksGenerated(value: string): boolean {
  if (!value || value.length > 64) return true;
  return GENERATED.some((re) => re.test(value));
}

function esc(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(value);
  return value.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);
}

function attr(name: string, value: string): string {
  return `[${name}="${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"]`;
}

function count(selector: string, root: ParentNode = document): number {
  try {
    return root.querySelectorAll(selector).length;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

const unique = (selector: string, root: ParentNode = document) => count(selector, root) === 1;

function isShown(el: Element): boolean {
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return false;
  const style = getComputedStyle(el);
  return style.visibility !== "hidden" && style.display !== "none";
}

/**
 * True when `selector` matches `el` and no other *visible* element. Hidden duplicates (mobile
 * menus, off-screen copies) are tolerated because the runtime picks the first visible match.
 */
function uniqueAmongVisible(selector: string, el: Element): "unique" | "visible" | false {
  let all: Element[];
  try {
    all = Array.from(document.querySelectorAll(selector));
  } catch {
    return false;
  }
  if (all.length === 1) return all[0] === el ? "unique" : false;
  if (!all.includes(el) || !isShown(el)) return false;
  return all.filter((e) => e !== el && isShown(e)).length === 0 ? "visible" : false;
}

const HIDDEN_COPY =
  "also matches hidden copies of this element (e.g. a mobile menu); the visible one is used";

interface Candidate {
  selector: string;
  quality: SelectorQuality;
  reason?: string;
}

/** Candidates for one element, best first (not yet checked for uniqueness). */
function candidates(el: Element): Candidate[] {
  const tag = el.tagName.toLowerCase();
  const out: Candidate[] = [];
  const tourId = el.getAttribute("data-tour-id");
  if (tourId) out.push({ selector: attr("data-tour-id", tourId), quality: "stable" });
  if (el.id && !looksGenerated(el.id)) out.push({ selector: `#${esc(el.id)}`, quality: "stable" });
  for (const name of STABLE_DATA_ATTRS) {
    const v = el.getAttribute(name);
    if (v && v.length <= 100) {
      out.push({
        selector: attr(name, v),
        quality: /\d{3,}/.test(v) ? "good" : "stable",
        reason: /\d{3,}/.test(v) ? `${name} contains a number that may change` : undefined,
      });
    }
  }
  const aria = el.getAttribute("aria-label");
  if (aria && aria.length <= 80)
    out.push({
      selector: `${tag}${attr("aria-label", aria)}`,
      quality: "good",
      reason: "based on a label that may be reworded or translated",
    });
  const name = el.getAttribute("name");
  if (name && /^(input|select|textarea|button)$/.test(tag) && !looksGenerated(name))
    out.push({ selector: `${tag}${attr("name", name)}`, quality: "good" });
  const alt = el.getAttribute("alt");
  if (tag === "img" && alt && alt.length <= 80)
    out.push({
      selector: `img${attr("alt", alt)}`,
      quality: "good",
      reason: "based on image alt text",
    });
  const title = el.getAttribute("title");
  if (title && title.length <= 80)
    out.push({
      selector: `${tag}${attr("title", title)}`,
      quality: "good",
      reason: "based on a tooltip text",
    });
  const href = el.getAttribute("href");
  if (tag === "a" && href && href.startsWith("/") && !href.includes("?") && href.length <= 120)
    out.push({
      selector: `a${attr("href", href)}`,
      quality: "good",
      reason: "based on the link address",
    });
  const classes = Array.from(el.classList)
    .filter((c) => !looksGenerated(c))
    .slice(0, 2);
  if (classes.length)
    out.push({
      selector: `${tag}${classes.map((c) => `.${esc(c)}`).join("")}`,
      quality: "good",
      reason: "based on styling classes that may change in a redesign",
    });
  return out;
}

function nthOfType(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const parent = el.parentElement;
  if (!parent) return tag;
  const same = Array.from(parent.children).filter((c) => c.tagName === el.tagName);
  return same.length === 1 ? tag : `${tag}:nth-of-type(${same.indexOf(el) + 1})`;
}

/** Shortest child-path from `ancestor` down to `el`, preferring stable candidates per level. */
function pathBetween(ancestor: Element, el: Element): string[] {
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && node !== ancestor) {
    const parent: Element | null = node.parentElement;
    const scoped = candidates(node).find(
      (c) => c.quality === "stable" && parent !== null && unique(`:scope > ${c.selector}`, parent),
    );
    parts.unshift(scoped ? scoped.selector : nthOfType(node));
    node = node.parentElement;
  }
  return parts;
}

export function generateSelector(el: Element): SelectorResult {
  // 1. A candidate on the element itself that is unique on the page (or among visible elements).
  for (const c of candidates(el)) {
    const u = uniqueAmongVisible(c.selector, el);
    if (!u) continue;
    const reasons = [c.reason, u === "visible" ? HIDDEN_COPY : undefined].filter((r): r is string =>
      Boolean(r),
    );
    return {
      selector: c.selector,
      quality: u === "visible" && c.quality === "stable" ? "good" : c.quality,
      reasons,
    };
  }

  // 2. Anchor on the nearest ancestor with a unique stable candidate (up to 6 levels).
  let ancestor = el.parentElement;
  for (
    let depth = 0;
    ancestor && ancestor !== document.documentElement && depth < 6;
    depth++, ancestor = ancestor.parentElement
  ) {
    const anchor = candidates(ancestor).find((c) => c.quality === "stable" && unique(c.selector));
    if (!anchor) continue;
    // Prefer "anchor descendant" with the element's own candidate if that is unique inside the anchor.
    const own = candidates(el).find(
      (c) => unique(c.selector, ancestor!) && unique(`${anchor.selector} ${c.selector}`),
    );
    if (own) {
      const selector = `${anchor.selector} ${own.selector}`;
      return {
        selector,
        quality: own.quality === "stable" ? "stable" : "good",
        reasons: own.reason ? [own.reason] : [],
      };
    }
    const selector = [anchor.selector, ...pathBetween(ancestor, el)].join(" > ");
    if (unique(selector)) {
      const positional = selector.includes(":nth-of-type");
      return {
        selector,
        quality: positional ? "fragile" : "good",
        reasons: positional
          ? ["depends on the element's position, which can change if the page layout changes"]
          : [],
      };
    }
  }

  // 3. Positional path from <body>.
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && node !== document.body && node !== document.documentElement) {
    parts.unshift(nthOfType(node));
    node = node.parentElement;
  }
  return {
    selector: ["body", ...parts].join(" > "),
    quality: "fragile",
    reasons: ["no stable attribute found; this selector depends on page structure and may break"],
  };
}

/** Number of elements a (possibly user-edited) selector matches; -1 when invalid. */
export function matchCount(selector: string): number {
  const n = count(selector);
  return Number.isFinite(n) ? n : -1;
}

/** Visible and total match counts for the builder's live feedback; null when invalid. */
export function matchSummary(selector: string): { total: number; visible: number } | null {
  let all: Element[];
  try {
    all = Array.from(document.querySelectorAll(selector));
  } catch {
    return null;
  }
  return { total: all.length, visible: all.filter(isShown).length };
}
