import "server-only";
import type { NextRequest } from "next/server";
import { requireUser, type CurrentUser } from "../auth";
import { env } from "../env";
import { toErrorResponse } from "./respond";
import { assertSameOrigin } from "./same-origin";

type RouteContext<P> = { params: Promise<P> };

/**
 * Wraps an admin route handler: CSRF origin check for mutations, Clerk authentication,
 * and uniform error mapping. Ownership is enforced inside the services.
 */
export function adminRoute<P extends Record<string, string> = Record<string, never>>(
  handler: (req: NextRequest, ctx: { params: P; user: CurrentUser }) => Promise<Response>,
) {
  return async (req: NextRequest, ctx: RouteContext<P>): Promise<Response> => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD")
        assertSameOrigin(req, env().NEXT_PUBLIC_APP_URL);
      const user = await requireUser();
      return await handler(req, { params: await ctx.params, user });
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}
