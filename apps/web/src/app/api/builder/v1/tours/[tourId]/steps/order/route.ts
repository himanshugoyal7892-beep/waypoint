import { LIMITS, reorderStepsSchema } from "@waypoint/shared";
import { assertTourInSession, builderOptions, builderRoute } from "@/server/http/builder-route";
import { readJsonBody } from "@/server/http/body";
import { json } from "@/server/http/respond";
import { reorderSteps } from "@/server/services/steps";

export const dynamic = "force-dynamic";

export const PUT = builderRoute<{ tourId: string }>(async (req, { session, params }) => {
  await assertTourInSession(session, params.tourId);
  const { stepIds } = await readJsonBody(req, reorderStepsSchema, LIMITS.adminBodyBytes);
  return json({ steps: await reorderSteps(session.createdById, params.tourId, stepIds) });
});

export const OPTIONS = builderOptions;
