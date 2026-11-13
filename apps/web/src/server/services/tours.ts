import "server-only";
import type { Prisma, TourStatus } from "@prisma/client";
import {
  targetingIssues,
  validatePublishable,
  type CreateTourInput,
  type UpdateTourInput,
} from "@waypoint/shared";
import { db } from "../db";
import { ApiError, conflict } from "../http/errors";
import { ownProject, ownTour } from "../ownership";

export const tourSelect = {
  id: true,
  projectId: true,
  name: true,
  description: true,
  status: true,
  startUrl: true,
  triggerType: true,
  audience: true,
  audienceDays: true,
  audienceBefore: true,
  frequency: true,
  maxShows: true,
  intervalDays: true,
  startsAt: true,
  endsAt: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
  archivedAt: true,
} satisfies Prisma.TourSelect;

export const stepSelect = {
  id: true,
  tourId: true,
  stepOrder: true,
  title: true,
  description: true,
  cssSelector: true,
  pageUrl: true,
  placement: true,
  nextButtonLabel: true,
  backButtonLabel: true,
  allowSkip: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TourStepSelect;

export async function listTours(userId: string, projectId: string, status?: TourStatus) {
  await ownProject(userId, projectId);
  return db.tour.findMany({
    where: { projectId, ...(status ? { status } : {}) },
    orderBy: { updatedAt: "desc" },
    select: { ...tourSelect, _count: { select: { steps: true } } },
  });
}

export async function createTour(userId: string, projectId: string, input: CreateTourInput) {
  await ownProject(userId, projectId);
  return db.tour.create({ data: { ...input, projectId }, select: tourSelect });
}

export async function getTour(userId: string, tourId: string) {
  await ownTour(userId, tourId);
  return db.tour.findUniqueOrThrow({
    where: { id: tourId },
    select: {
      ...tourSelect,
      steps: { orderBy: { stepOrder: "asc" }, select: stepSelect },
      project: {
        select: {
          id: true,
          name: true,
          allowedOrigins: true,
          publicKey: true,
          identitySource: true,
        },
      },
    },
  });
}

export async function updateTour(userId: string, tourId: string, input: UpdateTourInput) {
  await ownTour(userId, tourId);
  const current = await db.tour.findUniqueOrThrow({ where: { id: tourId }, select: tourSelect });
  const issues = targetingIssues({ ...current, ...input });
  if (issues.length)
    throw new ApiError(400, "VALIDATION_ERROR", "Some targeting settings are incomplete.", issues);
  return db.tour.update({ where: { id: tourId }, data: input, select: tourSelect });
}

export async function deleteTour(userId: string, tourId: string) {
  await ownTour(userId, tourId);
  await db.tour.delete({ where: { id: tourId } });
}

/** Loads everything the publish rules need and returns the issues (empty = publishable). */
export async function checkPublishable(userId: string, tourId: string) {
  await ownTour(userId, tourId);
  const tour = await db.tour.findUniqueOrThrow({
    where: { id: tourId },
    select: {
      status: true,
      startUrl: true,
      project: { select: { allowedOrigins: true } },
      steps: {
        select: {
          id: true,
          stepOrder: true,
          pageUrl: true,
          cssSelector: true,
          title: true,
          description: true,
        },
      },
    },
  });
  return validatePublishable(tour);
}

export async function publishTour(userId: string, tourId: string) {
  await ownTour(userId, tourId);
  return db.$transaction(async (tx) => {
    const tour = await tx.tour.findUniqueOrThrow({
      where: { id: tourId },
      select: {
        status: true,
        startUrl: true,
        project: { select: { allowedOrigins: true } },
        steps: {
          select: {
            id: true,
            stepOrder: true,
            pageUrl: true,
            cssSelector: true,
            title: true,
            description: true,
          },
        },
      },
    });
    const issues = validatePublishable(tour);
    if (issues.length)
      throw new ApiError(
        422,
        "PUBLISH_VALIDATION_FAILED",
        `This tour can't be published yet: ${issues.length} issue(s) to fix.`,
        issues,
      );
    return tx.tour.update({
      where: { id: tourId },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        archivedAt: null,
        version: { increment: 1 },
      },
      select: tourSelect,
    });
  });
}

async function transition(
  userId: string,
  tourId: string,
  from: TourStatus[],
  data: Prisma.TourUpdateManyMutationInput,
  verb: string,
) {
  await ownTour(userId, tourId);
  const result = await db.tour.updateMany({ where: { id: tourId, status: { in: from } }, data });
  if (result.count === 0)
    throw conflict(`Only ${from.join(" or ").toLowerCase()} tours can be ${verb}.`);
  return db.tour.findUniqueOrThrow({ where: { id: tourId }, select: tourSelect });
}

export const unpublishTour = (userId: string, tourId: string) =>
  transition(userId, tourId, ["PUBLISHED"], { status: "DRAFT" }, "unpublished");

export const archiveTour = (userId: string, tourId: string) =>
  transition(
    userId,
    tourId,
    ["DRAFT", "PUBLISHED"],
    { status: "ARCHIVED", archivedAt: new Date() },
    "archived",
  );

export const restoreTour = (userId: string, tourId: string) =>
  transition(userId, tourId, ["ARCHIVED"], { status: "DRAFT", archivedAt: null }, "restored");
