import { LIMITS, aiWordingSchema } from "@waypoint/shared";
import { aiReword } from "@/server/ai/service";
import { readJsonBody } from "@/server/http/body";
import { json } from "@/server/http/respond";
import { adminRoute } from "@/server/http/route";
import { enforceRateLimit } from "@/server/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const POST = adminRoute(async (req, { user }) => {
  await enforceRateLimit("ai", req, `user:${user.id}`);
  const input = await readJsonBody(req, aiWordingSchema, LIMITS.adminBodyBytes);
  return json({ result: await aiReword(input) });
});
