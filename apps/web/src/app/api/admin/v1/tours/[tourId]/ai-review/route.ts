import { aiDemoMode, aiReview } from "@/server/ai/service";
import { json } from "@/server/http/respond";
import { adminRoute } from "@/server/http/route";
import { enforceRateLimit } from "@/server/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const POST = adminRoute<{ tourId: string }>(async (req, { user, params }) => {
  await enforceRateLimit("ai", req, `user:${user.id}`);
  return json({ result: await aiReview(user.id, params.tourId), demo: aiDemoMode() });
});
