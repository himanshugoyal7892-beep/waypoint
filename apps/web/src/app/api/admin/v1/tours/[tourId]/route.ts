import { LIMITS, updateTourSchema } from "@waypoint/shared";
import { readJsonBody } from "@/server/http/body";
import { json, noContent } from "@/server/http/respond";
import { adminRoute } from "@/server/http/route";
import { checkPublishable, deleteTour, getTour, updateTour } from "@/server/services/tours";

type Params = { tourId: string };

export const GET = adminRoute<Params>(async (_req, { user, params }) => {
  const tour = await getTour(user.id, params.tourId);
  return json({ tour, publishIssues: await checkPublishable(user.id, params.tourId) });
});

export const PATCH = adminRoute<Params>(async (req, { user, params }) => {
  const input = await readJsonBody(req, updateTourSchema, LIMITS.adminBodyBytes);
  return json({ tour: await updateTour(user.id, params.tourId, input) });
});

export const DELETE = adminRoute<Params>(async (_req, { user, params }) => {
  await deleteTour(user.id, params.tourId);
  return noContent();
});
