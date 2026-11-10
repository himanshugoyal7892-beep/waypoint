import { LIMITS, createStepSchema } from "@waypoint/shared";
import { readJsonBody } from "@/server/http/body";
import { json } from "@/server/http/respond";
import { adminRoute } from "@/server/http/route";
import { createStep, listSteps } from "@/server/services/steps";

type Params = { tourId: string };

export const GET = adminRoute<Params>(async (_req, { user, params }) =>
  json({ steps: await listSteps(user.id, params.tourId) }),
);

export const POST = adminRoute<Params>(async (req, { user, params }) => {
  const input = await readJsonBody(req, createStepSchema, LIMITS.adminBodyBytes);
  return json({ step: await createStep(user.id, params.tourId, input) }, { status: 201 });
});
