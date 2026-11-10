import "server-only";
import { forbidden } from "./errors";

/**
 * CSRF defence for cookie-authenticated admin mutations: the Origin header (always sent by
 * browsers on non-GET requests) must be the dashboard's own origin. Requests without an
 * Origin (curl, server-to-server) are allowed. They carry no ambient browser cookies.
 */
export function assertSameOrigin(req: Request, appUrl: string): void {
  const origin = req.headers.get("origin");
  if (!origin) return;
  const expected = new URL(appUrl).origin;
  const self = new URL(req.url).origin;
  if (origin !== expected && origin !== self)
    throw forbidden("Cross-origin requests are not allowed.");
}
