import { LIMITS, createProjectSchema } from "@waypoint/shared";
import { readJsonBody } from "@/server/http/body";
import { json } from "@/server/http/respond";
import { adminRoute } from "@/server/http/route";
import { createProject, listProjects } from "@/server/services/projects";

export const GET = adminRoute(async (_req, { user }) => {
  const projects = await listProjects(user.id);
  return json({
    projects: projects.map(({ tours, ...p }) => ({ ...p, publishedTours: tours.length })),
  });
});

export const POST = adminRoute(async (req, { user }) => {
  const input = await readJsonBody(req, createProjectSchema, LIMITS.adminBodyBytes);
  return json({ project: await createProject(user.id, input) }, { status: 201 });
});
