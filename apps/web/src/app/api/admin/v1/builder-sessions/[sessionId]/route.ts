import { revokeBuilderSession } from "@/server/builder-pass/service";
import { noContent } from "@/server/http/respond";
import { adminRoute } from "@/server/http/route";

export const DELETE = adminRoute<{ sessionId: string }>(async (_req, { user, params }) => {
  await revokeBuilderSession(user.id, params.sessionId);
  return noContent();
});
