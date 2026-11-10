import { json } from "@/server/http/respond";
import { adminRoute } from "@/server/http/route";
import { getInstallInstructions } from "@/server/services/install";

export const GET = adminRoute<{ projectId: string }>(async (_req, { user, params }) =>
  json({ install: await getInstallInstructions(user.id, params.projectId) }),
);
