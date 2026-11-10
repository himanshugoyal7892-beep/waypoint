import { RESOURCE_ID_PATTERN } from "@waypoint/shared";
import { notFound } from "./http/errors";

/**
 * Ownership checks. Every admin read/write of a project, tour or step goes through one of
 * these. The owner filter is part of the database query itself, so a resource that exists
 * but belongs to someone else is indistinguishable from one that doesn't exist (404).
 *
 * The store interface is the minimal slice of the Prisma client used, which keeps this
 * module unit-testable without a database.
 */
export interface OwnershipStore {
  project: {
    findFirst(args: {
      where: { id: string; createdById: string };
      select: { id: true };
    }): Promise<{ id: string } | null>;
  };
  tour: {
    findFirst(args: {
      where: { id: string; project: { createdById: string } };
      select: { id: true; projectId: true };
    }): Promise<{ id: string; projectId: string } | null>;
  };
  tourStep: {
    findFirst(args: {
      where: { id: string; tour: { project: { createdById: string } } };
      select: { id: true; tourId: true };
    }): Promise<{ id: string; tourId: string } | null>;
  };
}

function validId(id: unknown): id is string {
  return typeof id === "string" && RESOURCE_ID_PATTERN.test(id);
}

export async function assertProjectOwner(store: OwnershipStore, userId: string, projectId: string) {
  if (!validId(projectId)) throw notFound("Project");
  const row = await store.project.findFirst({
    where: { id: projectId, createdById: userId },
    select: { id: true },
  });
  if (!row) throw notFound("Project");
  return row;
}

export async function assertTourOwner(store: OwnershipStore, userId: string, tourId: string) {
  if (!validId(tourId)) throw notFound("Tour");
  const row = await store.tour.findFirst({
    where: { id: tourId, project: { createdById: userId } },
    select: { id: true, projectId: true },
  });
  if (!row) throw notFound("Tour");
  return row;
}

export async function assertStepOwner(store: OwnershipStore, userId: string, stepId: string) {
  if (!validId(stepId)) throw notFound("Step");
  const row = await store.tourStep.findFirst({
    where: { id: stepId, tour: { project: { createdById: userId } } },
    select: { id: true, tourId: true },
  });
  if (!row) throw notFound("Step");
  return row;
}
