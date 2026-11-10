import { json } from "@/server/http/respond";
import { notFound } from "@/server/http/errors";
import { adminRoute } from "@/server/http/route";
import { archiveTour, publishTour, restoreTour, unpublishTour } from "@/server/services/tours";

// POST /api/admin/v1/tours/{tourId}/publish | unpublish | archive | restore
const ACTIONS = {
  publish: publishTour,
  unpublish: unpublishTour,
  archive: archiveTour,
  restore: restoreTour,
} as const;

export const POST = adminRoute<{ tourId: string; action: string }>(
  async (_req, { user, params }) => {
    const run = ACTIONS[params.action as keyof typeof ACTIONS];
    if (!run || !Object.hasOwn(ACTIONS, params.action)) throw notFound("Action");
    return json({ tour: await run(user.id, params.tourId) });
  },
);
