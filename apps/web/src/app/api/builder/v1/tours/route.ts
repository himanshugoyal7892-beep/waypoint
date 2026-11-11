import { LIMITS, createTourSchema } from "@waypoint/shared";
import { builderOptions, builderRoute } from "@/server/http/builder-route";
import { readJsonBody } from "@/server/http/body";
import { json } from "@/server/http/respond";
import { createTour } from "@/server/services/tours";

export const dynamic = "force-dynamic";

// POST /api/builder/v1/tours: create a draft tour from the on-site builder.
export const POST = builderRoute(async (req, { session }) => {
  const input = await readJsonBody(req, createTourSchema, LIMITS.adminBodyBytes);
  return json(
    { tour: await createTour(session.createdById, session.projectId, input) },
    { status: 201 },
  );
});

export const OPTIONS = builderOptions;
