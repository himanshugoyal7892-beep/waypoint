import "server-only";
import {
  isOriginAllowed,
  matchPathPattern,
  normalizePathname,
  type PublicIdentityConfig,
  type PublicTour,
} from "@waypoint/shared";
import { db } from "../db";
import { forbidden, notFound } from "../http/errors";

/** Loads the project for a public key and enforces the origin allowlist. */
export async function resolvePublicProject(publicKey: string, origin: string | null) {
  const project = await db.project.findUnique({
    where: { publicKey },
    select: {
      id: true,
      allowedOrigins: true,
      identitySource: true,
      identityKey: true,
      identitySalt: true,
    },
  });
  if (!project) throw notFound("Project");
  if (!isOriginAllowed(origin, project.allowedOrigins))
    throw forbidden("This origin is not allowed for the project.");
  return project;
}

/**
 * Published tours relevant to `path`: those whose startUrl matches (eligible to start), or
 * that contain a step on this page (so a cross-page tour can resume). Only SDK-required fields
 * are returned: no ids of users, no timestamps, no draft content.
 */
export async function getEligibleTours(projectId: string, path: string): Promise<PublicTour[]> {
  const tours = await db.tour.findMany({
    where: { projectId, status: "PUBLISHED" },
    orderBy: { publishedAt: "asc" },
    select: {
      id: true,
      version: true,
      name: true,
      triggerType: true,
      frequency: true,
      startUrl: true,
      steps: {
        orderBy: { stepOrder: "asc" },
        select: {
          id: true,
          stepOrder: true,
          title: true,
          description: true,
          cssSelector: true,
          pageUrl: true,
          placement: true,
          nextButtonLabel: true,
          backButtonLabel: true,
          allowSkip: true,
        },
      },
    },
  });
  const here = normalizePathname(path);
  return tours.filter(
    (t) =>
      t.steps.length > 0 &&
      (matchPathPattern(t.startUrl, here) ||
        t.steps.some((s) => normalizePathname(s.pageUrl) === here)),
  );
}

/** The project's "who is this user" setting, as the SDK needs it (null when not configured). */
export function publicIdentity(project: {
  identitySource: string;
  identityKey: string | null;
}): PublicIdentityConfig | null {
  if (project.identitySource === "NONE" || !project.identityKey) return null;
  return {
    source: project.identitySource as PublicIdentityConfig["source"],
    key: project.identityKey,
  };
}
