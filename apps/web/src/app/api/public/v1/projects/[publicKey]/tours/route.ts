import {
  PUBLIC_KEY_PATTERN,
  publicToursQuerySchema,
  type PublicToursResponse,
} from "@waypoint/shared";
import type { NextRequest } from "next/server";
import { ApiError } from "@/server/http/errors";
import { json, noContent, toErrorResponse } from "@/server/http/respond";
import { PUBLIC_TOURS_CORS, corsHeaders, requestOrigin } from "@/server/public/cors-core";
import { getEligibleTours, resolvePublicProject } from "@/server/public/tours";
import { enforceRateLimit } from "@/server/rate-limit";

type Ctx = { params: Promise<{ publicKey: string }> };

export const dynamic = "force-dynamic";

// GET /api/public/v1/projects/{publicKey}/tours?path=/products/x
export async function GET(req: NextRequest, ctx: Ctx) {
  const origin = requestOrigin(req.headers, req.url);
  let cors = corsHeaders(origin, false);
  try {
    const { publicKey } = await ctx.params;
    if (!PUBLIC_KEY_PATTERN.test(publicKey))
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid project key.");
    await enforceRateLimit("public_tours", req, publicKey);
    const { path } = publicToursQuerySchema.parse({
      path: req.nextUrl.searchParams.get("path") ?? undefined,
    });
    const project = await resolvePublicProject(publicKey, origin);
    cors = corsHeaders(origin, true, PUBLIC_TOURS_CORS);
    const body: PublicToursResponse = { tours: await getEligibleTours(project.id, path) };
    return json(body, {
      headers: {
        ...cors,
        "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    return toErrorResponse(err, cors);
  }
}

export async function OPTIONS(req: NextRequest, ctx: Ctx) {
  const origin = req.headers.get("origin");
  try {
    const { publicKey } = await ctx.params;
    if (!PUBLIC_KEY_PATTERN.test(publicKey)) return noContent(corsHeaders(origin, false));
    await resolvePublicProject(publicKey, origin);
    return noContent(corsHeaders(origin, true, PUBLIC_TOURS_CORS));
  } catch {
    return noContent(corsHeaders(origin, false));
  }
}
