import { notFound } from "@/server/http/errors";
import { assertTourInSession, builderOptions, builderRoute } from "@/server/http/builder-route";
import { json } from "@/server/http/respond";
import { publishTour, unpublishTour } from "@/server/services/tours";

export const dynamic = "force-dynamic";

const ACTIONS = { publish: publishTour, unpublish: unpublishTour } as const;

// POST /api/builder/v1/tours/{tourId}/publish | unpublish
export const POST = builderRoute<{ tourId: string; action: string }>(
  async (_req, { session, params }) => {
    if (!Object.hasOwn(ACTIONS, params.action)) throw notFound("Action");
    await assertTourInSession(session, params.tourId);
    const run = ACTIONS[params.action as keyof typeof ACTIONS];
    return json({ tour: await run(session.createdById, params.tourId) });
  },
);

export const OPTIONS = builderOptions;
