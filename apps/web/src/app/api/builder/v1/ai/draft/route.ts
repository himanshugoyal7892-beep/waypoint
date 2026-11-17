import { LIMITS, aiDraftSchema } from "@waypoint/shared";
import { aiDraft } from "@/server/ai/service";
import { readJsonBody } from "@/server/http/body";
import { assertTourInSession, builderOptions, builderRoute } from "@/server/http/builder-route";
import { json } from "@/server/http/respond";
import { enforceRateLimit } from "@/server/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Proposes a tour from the builder's page scan. Nothing is saved: the builder adds the steps. */
export const POST = builderRoute(async (req, { session }) => {
  await enforceRateLimit("ai", req, `user:${session.createdById}`);
  const input = await readJsonBody(req, aiDraftSchema, LIMITS.adminBodyBytes);
  await assertTourInSession(session, input.tourId);
  return json({ result: await aiDraft(input) });
});

export const OPTIONS = builderOptions;
