export type FindResult =
  | { element: Element }
  | { element: null; reason: "invalid_selector" | "timeout" | "aborted" };

/**
 * First match, preferring a visible one: responsive sites often render hidden duplicates
 * (e.g. a mobile header next to the desktop header) that match the same selector.
 */
function query(
  selector: string,
  visible: (el: Element) => boolean = isVisible,
): Element | null | "invalid" {
  let all: NodeListOf<Element>;
  try {
    all = document.querySelectorAll(selector);
  } catch {
    return "invalid";
  }
  if (all.length <= 1) return all[0] ?? null;
  for (const el of Array.from(all)) if (visible(el)) return el;
  return all[0] ?? null;
}

/** Zero-size, display:none and visibility:hidden elements can't be pointed at. */
export function isVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  const style = getComputedStyle(el);
  return style.visibility !== "hidden" && style.display !== "none";
}

/**
 * Resolves the selector to a visible element, waiting (MutationObserver) for late-rendered
 * content up to `timeoutMs`. Never throws.
 */
export function findElement(
  selector: string,
  {
    timeoutMs = 5000,
    signal,
    visible = isVisible,
  }: { timeoutMs?: number; signal?: AbortSignal; visible?: (el: Element) => boolean } = {},
): Promise<FindResult> {
  const first = query(selector, visible);
  if (first === "invalid") return Promise.resolve({ element: null, reason: "invalid_selector" });
  if (first && visible(first)) return Promise.resolve({ element: first });

  return new Promise((resolve) => {
    let done = false;
    const finish = (r: FindResult) => {
      if (done) return;
      done = true;
      observer.disconnect();
      clearTimeout(timer);
      clearInterval(poll);
      signal?.removeEventListener("abort", onAbort);
      resolve(r);
    };
    const tryFind = () => {
      const el = query(selector, visible);
      if (el && el !== "invalid" && visible(el)) finish({ element: el });
    };
    const onAbort = () => finish({ element: null, reason: "aborted" });
    const observer = new MutationObserver(tryFind);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
    });
    // Style/layout changes that don't mutate the DOM (e.g. CSS transitions) are caught by polling.
    const poll = setInterval(tryFind, 250);
    const timer = setTimeout(() => finish({ element: null, reason: "timeout" }), timeoutMs);
    if (signal?.aborted) onAbort();
    else signal?.addEventListener("abort", onAbort);
  });
}

export function isInViewport(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return (
    r.top >= 0 && r.left >= 0 && r.bottom <= window.innerHeight && r.right <= window.innerWidth
  );
}
