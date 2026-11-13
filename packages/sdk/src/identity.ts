import type { PublicIdentityConfig } from "@waypoint/shared/api-types";

/** Values that mean "nobody is logged in". */
const EMPTY = new Set(["", "null", "undefined", "0", "false", "guest", "anonymous"]);
const MAX_LEN = 200;

function clean(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const s = String(value).trim();
  if (EMPTY.has(s.toLowerCase()) || s.length > MAX_LEN) return null;
  return s;
}

/** Reads `a.b.c` from an object without calling anything except plain property access. */
function readPath(root: unknown, path: string): unknown {
  let cur: unknown = root;
  for (const part of path.split(".")) {
    if (cur === null || (typeof cur !== "object" && typeof cur !== "function")) return undefined;
    try {
      cur = (cur as Record<string, unknown>)[part];
    } catch {
      return undefined;
    }
  }
  return cur;
}

/** Latest non-empty value for `key` pushed to Google Tag Manager's dataLayer. */
function readDataLayer(win: Window, key: string): unknown {
  const dl = (win as unknown as { dataLayer?: unknown }).dataLayer;
  if (!Array.isArray(dl)) return undefined;
  for (let i = dl.length - 1; i >= 0; i--) {
    const entry: unknown = dl[i];
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      const v = clean(readPath(entry, key));
      if (v) return v;
    }
  }
  return undefined;
}

function readCookie(doc: Document, name: string): unknown {
  for (const part of doc.cookie.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0 || part.slice(0, eq).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(eq + 1).trim());
    } catch {
      return part.slice(eq + 1).trim();
    }
  }
  return undefined;
}

/**
 * The logged-in user's id on the customer's site, read from where the project setting says
 * (a page variable, a Tag Manager field, or a cookie). Null when logged out or not configured.
 */
export function readUserId(
  config: PublicIdentityConfig | null,
  win: Window = window,
  doc: Document = document,
): string | null {
  if (!config) return null;
  try {
    switch (config.source) {
      case "WINDOW":
        return clean(readPath(win, config.key));
      case "DATALAYER":
        return clean(readDataLayer(win, config.key));
      case "COOKIE":
        return clean(readCookie(doc, config.key));
    }
  } catch {
    return null;
  }
}

/** Waits briefly for the site to fill in the user id (SPAs often set it after first paint). */
export async function waitForUserId(
  config: PublicIdentityConfig | null,
  timeoutMs = 1500,
  stepMs = 250,
): Promise<string | null> {
  let id = readUserId(config);
  for (let waited = 0; !id && config && waited < timeoutMs; waited += stepMs) {
    await new Promise((r) => setTimeout(r, stepMs));
    id = readUserId(config);
  }
  return id;
}
