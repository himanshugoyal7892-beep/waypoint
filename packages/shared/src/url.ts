import { LIMITS } from "./limits";

/**
 * URL privacy rule (approved decision 16): only origin + pathname are ever stored.
 * Query strings and fragments are removed because they routinely carry tokens, emails,
 * search terms and, for builder launches, the builder pass itself.
 *
 * Returns null for anything that is not an absolute http(s) URL.
 */
export function sanitizeTrackedUrl(input: string): string | null {
  if (typeof input !== "string" || input.length === 0 || input.length > LIMITS.url) return null;
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  // Credentials in URLs are never legitimate here.
  if (url.username || url.password) return null;
  return `${url.origin}${normalizePathname(url.pathname)}`;
}

/** Collapses duplicate slashes and removes a trailing slash (except for the root). */
export function normalizePathname(pathname: string): string {
  let p = pathname.replace(/\/{2,}/g, "/");
  if (!p.startsWith("/")) p = `/${p}`;
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p;
}

const PATH_CHARS = /^\/[A-Za-z0-9\-._~!$&'()+,;=:@%/]*$/;
const PATTERN_CHARS = /^\/[A-Za-z0-9\-._~!$&'()+,;=:@%/*]*$/;

/**
 * Validates a concrete page pathname (TourStep.pageUrl). Returns an error message or null.
 */
export function validatePathname(input: string): string | null {
  if (!input) return "Enter a page path, for example /products/aurora-headphones.";
  if (input.length > LIMITS.url) return `Page path must be at most ${LIMITS.url} characters.`;
  if (!input.startsWith("/")) return "Page path must start with “/” (a path, not a full URL).";
  if (input.includes("?") || input.includes("#"))
    return "Page path must not include a query string (?) or fragment (#).";
  if (input.includes("*")) return "Wildcards (*) are only allowed in a tour's start URL.";
  if (/\s/.test(input)) return "Page path must not contain spaces.";
  if (!PATH_CHARS.test(input)) return "Page path contains characters that are not allowed.";
  if (/%(?![0-9A-Fa-f]{2})/.test(input)) return "Page path contains an invalid % escape.";
  return null;
}

/**
 * Validates a path pattern (Tour.startUrl). `*` matches any sequence of characters,
 * including "/". Returns an error message or null.
 */
export function validatePathPattern(input: string): string | null {
  if (!input) return "Enter a start path, for example / or /products/*.";
  if (input.length > LIMITS.url) return `Start path must be at most ${LIMITS.url} characters.`;
  if (!input.startsWith("/")) return "Start path must start with “/” (a path, not a full URL).";
  if (input.includes("?") || input.includes("#"))
    return "Start path must not include a query string (?) or fragment (#).";
  if (/\s/.test(input)) return "Start path must not contain spaces.";
  if (!PATTERN_CHARS.test(input)) return "Start path contains characters that are not allowed.";
  if (input.includes("**")) return "Use a single * as the wildcard.";
  return null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
}

/** Matches a normalised pathname against a pattern from validatePathPattern. */
export function matchPathPattern(pattern: string, pathname: string): boolean {
  const p = normalizePathname(pattern);
  const path = normalizePathname(pathname);
  if (!p.includes("*")) return p === path;
  const re = new RegExp(`^${p.split("*").map(escapeRegExp).join(".*")}$`);
  return re.test(path);
}
