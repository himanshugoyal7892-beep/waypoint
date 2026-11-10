import { LIMITS, updateStepSchema } from "@waypoint/shared";
import { readJsonBody } from "@/server/http/body";
import { json, noContent } from "@/server/http/respond";
import { adminRoute } from "@/server/http/route";
import { deleteStep, getStep, updateStep } from "@/server/services/steps";

type Params = { stepId: string };

export const GET = adminRoute<Params>(async (_req, { user, params }) =>
  json({ step: await getStep(user.id, params.stepId) }),
);

export const PATCH = adminRoute<Params>(async (req, { user, params }) => {
  const input = await readJsonBody(req, updateStepSchema, LIMITS.adminBodyBytes);
  return json({ step: await updateStep(user.id, params.stepId, input) });
});

export const DELETE = adminRoute<Params>(async (_req, { user, params }) => {
  await deleteStep(user.id, params.stepId);
  return noContent();
});
