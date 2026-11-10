import { LIMITS, reorderStepsSchema } from "@waypoint/shared";
import { readJsonBody } from "@/server/http/body";
import { json } from "@/server/http/respond";
import { adminRoute } from "@/server/http/route";
import { reorderSteps } from "@/server/services/steps";

export const PUT = adminRoute<{ tourId: string }>(async (req, { user, params }) => {
  const { stepIds } = await readJsonBody(req, reorderStepsSchema, LIMITS.adminBodyBytes);
  return json({ steps: await reorderSteps(user.id, params.tourId, stepIds) });
});
