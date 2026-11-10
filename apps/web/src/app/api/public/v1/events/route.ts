import { LIMITS, analyticsBatchSchema } from "@waypoint/shared";
import type { NextRequest } from "next/server";
import { readBeaconBody } from "@/server/http/body";
import { json, noContent, toErrorResponse } from "@/server/http/respond";
import { PUBLIC_EVENTS_CORS, corsHeaders } from "@/server/public/cors-core";
import { ingestEvents } from "@/server/public/events";
import { isKnownOrigin } from "@/server/public/known-origin";
import { resolvePublicProject } from "@/server/public/tours";
import { enforceRateLimit } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/public/v1/events with a text/plain JSON body (sendBeacon-compatible, so no CORS
 * preflight is triggered). The rate-limit key is per IP before parsing and per IP+project after.
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  let cors = corsHeaders(origin, false);
  try {
    await enforceRateLimit("public_ip", req, "events");
    const batch = await readBeaconBody(req, analyticsBatchSchema, LIMITS.publicBodyBytes);
    const project = await resolvePublicProject(batch.projectKey, origin);
    cors = corsHeaders(origin, true, PUBLIC_EVENTS_CORS);
    await enforceRateLimit("public_events", req, batch.projectKey, cors);
    const result = await ingestEvents(project.id, batch.events);
    return json(result, { status: 202, headers: cors });
  } catch (err) {
    return toErrorResponse(err, cors);
  }
}

/** Only reached if a client sends application/json (the SDK sends text/plain). */
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  // Without the body we can't identify the project: allow origins known to any project.
  // The POST itself re-checks the origin against the specific project.
  return noContent(corsHeaders(origin, await isKnownOrigin(origin), PUBLIC_EVENTS_CORS));
}
