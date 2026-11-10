import { LIMITS, updateProjectSchema } from "@waypoint/shared";
import { readJsonBody } from "@/server/http/body";
import { json, noContent } from "@/server/http/respond";
import { adminRoute } from "@/server/http/route";
import { deleteProject, getProject, updateProject } from "@/server/services/projects";

type Params = { projectId: string };

export const GET = adminRoute<Params>(async (_req, { user, params }) =>
  json({ project: await getProject(user.id, params.projectId) }),
);

export const PATCH = adminRoute<Params>(async (req, { user, params }) => {
  const input = await readJsonBody(req, updateProjectSchema, LIMITS.adminBodyBytes);
  return json({ project: await updateProject(user.id, params.projectId, input) });
});

export const DELETE = adminRoute<Params>(async (_req, { user, params }) => {
  await deleteProject(user.id, params.projectId);
  return noContent();
});
