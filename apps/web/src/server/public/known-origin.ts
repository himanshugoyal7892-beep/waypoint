import "server-only";
import { normalizeOrigin } from "@waypoint/shared";
import { db } from "../db";

/**
 * Preflight helper for endpoints where the project is only known from the body or a token:
 * is this origin allowed by any project? Uses the GIN index on Project.allowedOrigins.
 * The actual request re-checks the origin against the specific project.
 */
export async function isKnownOrigin(origin: string | null): Promise<boolean> {
  const normalized = origin ? normalizeOrigin(origin) : null;
  if (!normalized) return false;
  const hit = await db.project.findFirst({
    where: { allowedOrigins: { has: normalized } },
    select: { id: true },
  });
  return Boolean(hit);
}
