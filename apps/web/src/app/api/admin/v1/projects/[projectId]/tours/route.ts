import { LIMITS, createTourSchema, tourListQuerySchema } from "@waypoint/shared";
import { readJsonBody } from "@/server/http/body";
import { json } from "@/server/http/respond";
import { adminRoute } from "@/server/http/route";
import { createTour, listTours } from "@/server/services/tours";

type Params = { projectId: string };

export const GET = adminRoute<Params>(async (req, { user, params }) => {
  const { status } = tourListQuerySchema.parse({
    status: req.nextUrl.searchParams.get("status") ?? undefined,
  });
  return json({ tours: await listTours(user.id, params.projectId, status) });
});

export const POST = adminRoute<Params>(async (req, { user, params }) => {
  const input = await readJsonBody(req, createTourSchema, LIMITS.adminBodyBytes);
  return json({ tour: await createTour(user.id, params.projectId, input) }, { status: 201 });
});
