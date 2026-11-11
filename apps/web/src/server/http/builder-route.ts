import "server-only";
import type { NextRequest } from "next/server";
import { authenticateBuilder } from "../builder-pass/service";
import type { BuilderSessionRecord } from "../builder-pass/core";
import { db } from "../db";
import { BUILDER_CORS, bearerToken, corsHeaders } from "../public/cors-core";
import { isKnownOrigin } from "../public/known-origin";
import { enforceRateLimit } from "../rate-limit";
import { forbidden, notFound } from "./errors";
import { noContent, toErrorResponse } from "./respond";

type RouteContext<P> = { params: Promise<P> };

/**
 * Wraps a builder API handler: CORS for the customer site, rate limit, bearer-token
 * authentication bound to the request origin. Handlers act as the dashboard user who created
 * the builder pass, and only inside that pass's project (see assertTourInSession).
 */
export function builderRoute<P extends Record<string, string> = Record<string, never>>(
  handler: (
    req: NextRequest,
    ctx: { params: P; session: BuilderSessionRecord },
  ) => Promise<Response>,
) {
  return async (req: NextRequest, ctx: RouteContext<P>): Promise<Response> => {
    const origin = req.headers.get("origin");
    const cors = corsHeaders(origin, true, BUILDER_CORS);
    try {
      await enforceRateLimit("builder", req, "api", cors);
      const session = await authenticateBuilder(
        bearerToken(req.headers.get("authorization")),
        origin,
      );
      if (req.method !== "GET" && session.mode !== "BUILD")
        throw forbidden("This builder code only allows previewing.");
      const res = await handler(req, { params: await ctx.params, session });
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
      return res;
    } catch (err) {
      return toErrorResponse(err, cors);
    }
  };
}

/** CORS preflight for builder routes. */
export async function builderOptions(req: NextRequest): Promise<Response> {
  const origin = req.headers.get("origin");
  return noContent(corsHeaders(origin, await isKnownOrigin(origin), BUILDER_CORS));
}

/** 404 unless the tour belongs to the builder session's project. */
export async function assertTourInSession(session: BuilderSessionRecord, tourId: string) {
  const tour = await db.tour.findFirst({
    where: { id: tourId, projectId: session.projectId },
    select: { id: true },
  });
  if (!tour) throw notFound("Tour");
}

/** 404 unless the step belongs to a tour in the builder session's project. */
export async function assertStepInSession(session: BuilderSessionRecord, stepId: string) {
  const step = await db.tourStep.findFirst({
    where: { id: stepId, tour: { projectId: session.projectId } },
    select: { id: true },
  });
  if (!step) throw notFound("Step");
}
