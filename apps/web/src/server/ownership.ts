import "server-only";
import { assertProjectOwner, assertStepOwner, assertTourOwner, type OwnershipStore } from "./authz";
import { db } from "./db";

// Adapts the Prisma client to the narrow OwnershipStore interface (explicit wrappers avoid
// relying on structural compatibility with Prisma's generic method signatures).
const store: OwnershipStore = {
  project: { findFirst: (args) => db.project.findFirst(args) },
  tour: { findFirst: (args) => db.tour.findFirst(args) },
  tourStep: { findFirst: (args) => db.tourStep.findFirst(args) },
};

export const ownProject = (userId: string, projectId: string) =>
  assertProjectOwner(store, userId, projectId);
export const ownTour = (userId: string, tourId: string) => assertTourOwner(store, userId, tourId);
export const ownStep = (userId: string, stepId: string) => assertStepOwner(store, userId, stepId);
