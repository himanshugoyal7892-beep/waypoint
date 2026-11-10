/**
 * Allowed-origin handling. A project lists exact origins (scheme + host + optional port),
 * e.g. "https://shop.example.com" or "http://localhost:5173". Wildcards are deliberately not
 * supported (Phase 1 §3): exact origins keep CORS decisions simple and auditable and allow
 * an indexed `has` lookup for builder preflights.
 */

/**
 * Normalises user input to a canonical origin string, or null if it is not a valid
 * http(s) origin. Paths are only tolerated when they are just "/".
 */
export function normalizeOrigin(input: string): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 300) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (url.pathname !== "/" || url.search || url.hash) return null;
  if (!url.hostname || url.hostname.includes("*")) return null;
  // Plain http is accepted only for local development hosts.
  if (url.protocol === "http:" && !isLocalHost(url.hostname)) return null;
  // URL.origin lowercases the host and drops default ports.
  return url.origin;
}

export function isLocalHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  );
}

/** Explains why normalizeOrigin rejected an input (for actionable form errors). */
export function explainInvalidOrigin(input: string): string {
  const trimmed = input.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return `“${trimmed}” is not a full origin. Include the scheme, e.g. https://${trimmed.replace(/^\/+/, "")}`;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:")
    return "Origins must use http or https.";
  if (url.pathname !== "/" || url.search || url.hash)
    return `Remove the path from “${trimmed}”. Use only ${url.origin}.`;
  if (url.protocol === "http:" && !isLocalHost(url.hostname))
    return "Plain http is only allowed for localhost. Use https.";
  return `“${trimmed}” is not a valid origin.`;
}

/**
 * Whether a request Origin header value is permitted. The literal "null" origin (sandboxed
 * iframes, file://, some privacy modes) is always rejected.
 */
export function isOriginAllowed(
  requestOrigin: string | null | undefined,
  allowed: readonly string[],
): boolean {
  if (!requestOrigin || requestOrigin === "null") return false;
  const normalized = normalizeOrigin(requestOrigin);
  if (!normalized) return false;
  return allowed.includes(normalized);
}

/** Normalises and de-duplicates a list, dropping invalid entries. */
export function normalizeOriginList(inputs: readonly string[]): string[] {
  const out: string[] = [];
  for (const i of inputs) {
    const n = normalizeOrigin(i);
    if (n && !out.includes(n)) out.push(n);
  }
  return out;
}
