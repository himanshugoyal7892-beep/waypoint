import { assertTourInSession, builderOptions, builderRoute } from "@/server/http/builder-route";
import { json } from "@/server/http/respond";
import { checkPublishable, getTour } from "@/server/services/tours";

export const dynamic = "force-dynamic";

// GET /api/builder/v1/tours/{tourId}: tour with all steps, including drafts.
export const GET = builderRoute<{ tourId: string }>(async (_req, { session, params }) => {
  await assertTourInSession(session, params.tourId);
  const tour = await getTour(session.createdById, params.tourId);
  return json({ tour, publishIssues: await checkPublishable(session.createdById, params.tourId) });
});

export const OPTIONS = builderOptions;
