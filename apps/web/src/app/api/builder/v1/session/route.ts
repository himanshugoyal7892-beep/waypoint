import { LIMITS, redeemBuilderPassSchema } from "@waypoint/shared";
import type { NextRequest } from "next/server";
import { authenticateBuilder, redeemBuilderPass } from "@/server/builder-pass/service";
import { isKnownOrigin } from "@/server/public/known-origin";
import { db } from "@/server/db";
import { readBeaconBody } from "@/server/http/body";
import { json, noContent, toErrorResponse } from "@/server/http/respond";
import { BUILDER_CORS, bearerToken, corsHeaders } from "@/server/public/cors-core";
import { enforceRateLimit } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/builder/v1/session: redeem a single-use builder pass for an access token.
 * The body is never logged: it contains the pass.
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin, true, BUILDER_CORS);
  try {
    await enforceRateLimit("builder", req, "redeem", cors);
    const { pass } = await readBeaconBody(req, redeemBuilderPassSchema, LIMITS.publicBodyBytes);
    // Origin is verified against the pass's target origin inside redeemBuilderPass.
    return json(await redeemBuilderPass(pass, origin), { status: 201, headers: cors });
  } catch (err) {
    return toErrorResponse(err, cors);
  }
}

/** GET /api/builder/v1/session: validate the bearer token; return project + tours. */
export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin, true, BUILDER_CORS);
  try {
    await enforceRateLimit("builder", req, "session", cors);
    const session = await authenticateBuilder(
      bearerToken(req.headers.get("authorization")),
      origin,
    );
    const project = await db.project.findUniqueOrThrow({
      where: { id: session.projectId },
      select: {
        id: true,
        name: true,
        publicKey: true,
        tours: {
          where: { status: { not: "ARCHIVED" } },
          orderBy: { updatedAt: "desc" },
          select: { id: true, name: true, status: true },
        },
      },
    });
    return json(
      {
        project: { id: project.id, name: project.name, publicKey: project.publicKey },
        tours: project.tours,
        mode: session.mode,
        tourId: session.tourId,
        expiresAt: session.expiresAt.toISOString(),
      },
      { headers: cors },
    );
  } catch (err) {
    return toErrorResponse(err, cors);
  }
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return noContent(corsHeaders(origin, await isKnownOrigin(origin), BUILDER_CORS));
}
