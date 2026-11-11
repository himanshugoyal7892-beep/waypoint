import { getTourAnalytics, parseRange } from "@/server/analytics/service";
import { json } from "@/server/http/respond";
import { adminRoute } from "@/server/http/route";

// GET /api/admin/v1/tours/{tourId}/analytics?days=7|30|90
export const GET = adminRoute<{ tourId: string }>(async (req, { user, params }) =>
  json({
    analytics: await getTourAnalytics(
      user.id,
      params.tourId,
      parseRange(req.nextUrl.searchParams.get("days")),
    ),
  }),
);
