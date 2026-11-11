import { LIMITS, updateStepSchema } from "@waypoint/shared";
import { assertStepInSession, builderOptions, builderRoute } from "@/server/http/builder-route";
import { readJsonBody } from "@/server/http/body";
import { json, noContent } from "@/server/http/respond";
import { deleteStep, updateStep } from "@/server/services/steps";

export const dynamic = "force-dynamic";

type Params = { stepId: string };

export const PATCH = builderRoute<Params>(async (req, { session, params }) => {
  await assertStepInSession(session, params.stepId);
  const input = await readJsonBody(req, updateStepSchema, LIMITS.adminBodyBytes);
  return json({ step: await updateStep(session.createdById, params.stepId, input) });
});

export const DELETE = builderRoute<Params>(async (_req, { session, params }) => {
  await assertStepInSession(session, params.stepId);
  await deleteStep(session.createdById, params.stepId);
  return noContent();
});

export const OPTIONS = builderOptions;
