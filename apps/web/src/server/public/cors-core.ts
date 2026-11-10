/**
 * CORS header construction for the public SDK and builder APIs. Never `*`, never
 * credentials: the allowed origin is echoed only after it has been checked against the
 * project's allowedOrigins.
 */
export function corsHeaders(
  origin: string | null,
  allowed: boolean,
  opts: { methods: string; headers?: string; maxAgeSeconds?: number } = { methods: "GET, OPTIONS" },
): Record<string, string> {
  const h: Record<string, string> = { Vary: "Origin" };
  if (allowed && origin) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Methods"] = opts.methods;
    if (opts.headers) h["Access-Control-Allow-Headers"] = opts.headers;
    h["Access-Control-Max-Age"] = String(opts.maxAgeSeconds ?? 600);
  }
  return h;
}

export const PUBLIC_TOURS_CORS = { methods: "GET, OPTIONS" };
export const PUBLIC_EVENTS_CORS = { methods: "POST, OPTIONS", headers: "Content-Type" };
export const BUILDER_CORS = {
  methods: "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  headers: "Authorization, Content-Type",
};

/** Extracts a bearer token from an Authorization header. */
export function bearerToken(header: string | null): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return m ? m[1]! : null;
}

/**
 * The request's origin. Browsers omit the Origin header on same-origin GET requests, so for
 * those we trust the browser-set (unforgeable from page scripts) `Sec-Fetch-Site: same-origin`
 * and use the request's own origin. Non-browser clients get no fallback.
 */
export function requestOrigin(headers: Headers, requestUrl: string): string | null {
  const origin = headers.get("origin");
  if (origin) return origin;
  if (headers.get("sec-fetch-site") === "same-origin") {
    try {
      return new URL(requestUrl).origin;
    } catch {
      return null;
    }
  }
  return null;
}
