import { assertTourInSession, builderOptions, builderRoute } from "@/server/http/builder-route";
import { json } from "@/server/http/respond";
import { LIMITS, updateTourSchema } from "@waypoint/shared";
import { readJsonBody } from "@/server/http/body";
import { checkPublishable, getTour, updateTour } from "@/server/services/tours";

const renameSchema = updateTourSchema.innerType().pick({ name: true }).required();

export const dynamic = "force-dynamic";

// GET /api/builder/v1/tours/{tourId}: tour with all steps, including drafts.
export const GET = builderRoute<{ tourId: string }>(async (_req, { session, params }) => {
  await assertTourInSession(session, params.tourId);
  const tour = await getTour(session.createdById, params.tourId);
  return json({ tour, publishIssues: await checkPublishable(session.createdById, params.tourId) });
});

// PATCH: rename only (used after an AI draft). Other tour settings stay in the dashboard.
export const PATCH = builderRoute<{ tourId: string }>(async (req, { session, params }) => {
  await assertTourInSession(session, params.tourId);
  const input = await readJsonBody(req, renameSchema, LIMITS.adminBodyBytes);
  return json({ tour: await updateTour(session.createdById, params.tourId, input) });
});

export const OPTIONS = builderOptions;
