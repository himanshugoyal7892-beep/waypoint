import { LIMITS, visitRequestSchema } from "@waypoint/shared";
import type { NextRequest } from "next/server";
import { readBeaconBody } from "@/server/http/body";
import { json, noContent, toErrorResponse } from "@/server/http/respond";
import { PUBLIC_EVENTS_CORS, corsHeaders } from "@/server/public/cors-core";
import { isKnownOrigin } from "@/server/public/known-origin";
import { resolvePublicProject } from "@/server/public/tours";
import { recordVisit } from "@/server/public/visits";
import { enforceRateLimit } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/public/v1/visits with a text/plain JSON body (no CORS preflight, like analytics).
 * Returns the automatic tours this visitor may see in this visit. Never cached.
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  let cors = corsHeaders(origin, false);
  try {
    await enforceRateLimit("public_ip", req, "visits");
    const body = await readBeaconBody(req, visitRequestSchema, LIMITS.publicBodyBytes);
    const project = await resolvePublicProject(body.projectKey, origin);
    cors = corsHeaders(origin, true, PUBLIC_EVENTS_CORS);
    await enforceRateLimit("public_visits", req, body.projectKey, cors);
    const result = await recordVisit(project, body);
    return json(result, { headers: { ...cors, "Cache-Control": "no-store" } });
  } catch (err) {
    return toErrorResponse(err, cors);
  }
}

/** Only reached if a client sends application/json (the SDK sends text/plain). */
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return noContent(corsHeaders(origin, await isKnownOrigin(origin), PUBLIC_EVENTS_CORS));
}
