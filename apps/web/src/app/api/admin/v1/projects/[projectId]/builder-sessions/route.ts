import { LIMITS, createBuilderPassSchema } from "@waypoint/shared";
import { createBuilderPass } from "@/server/builder-pass/service";
import { readJsonBody } from "@/server/http/body";
import { json } from "@/server/http/respond";
import { adminRoute } from "@/server/http/route";

// POST: mint a single-use, project-scoped builder pass. The pass appears only in the
// fragment of `launchUrl`; it is not stored in plain text and not logged.
export const POST = adminRoute<{ projectId: string }>(async (req, { user, params }) => {
  const input = await readJsonBody(req, createBuilderPassSchema, LIMITS.adminBodyBytes);
  return json(
    { builderSession: await createBuilderPass(user.id, params.projectId, input) },
    { status: 201 },
  );
});
