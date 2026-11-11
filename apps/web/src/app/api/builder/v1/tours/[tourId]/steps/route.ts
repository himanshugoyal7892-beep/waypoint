import { LIMITS, createStepSchema } from "@waypoint/shared";
import { assertTourInSession, builderOptions, builderRoute } from "@/server/http/builder-route";
import { readJsonBody } from "@/server/http/body";
import { json } from "@/server/http/respond";
import { createStep } from "@/server/services/steps";

export const dynamic = "force-dynamic";

export const POST = builderRoute<{ tourId: string }>(async (req, { session, params }) => {
  await assertTourInSession(session, params.tourId);
  const input = await readJsonBody(req, createStepSchema, LIMITS.adminBodyBytes);
  return json(
    { step: await createStep(session.createdById, params.tourId, input) },
    { status: 201 },
  );
});

export const OPTIONS = builderOptions;
