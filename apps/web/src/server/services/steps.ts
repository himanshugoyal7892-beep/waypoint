import "server-only";
import {
  LIMITS,
  clampInsertPosition,
  insertAtPosition,
  moveToPosition,
  titleOrDescription,
  validateReorder,
  type CreateStepInput,
  type UpdateStepInput,
} from "@waypoint/shared";
import { db, type Tx } from "../db";
import { ApiError, badRequest } from "../http/errors";
import { ownStep, ownTour } from "../ownership";
import { stepSelect } from "./tours";

/**
 * Writes the final 1..N order. Rows are first moved to unique negative positions because
 * Postgres checks the non-deferrable UNIQUE (tourId, stepOrder) index row by row, so a
 * direct shuffle would collide mid-update.
 */
async function applyOrder(tx: Tx, orderedIds: readonly string[]) {
  for (const [i, id] of orderedIds.entries())
    await tx.tourStep.update({ where: { id }, data: { stepOrder: -(i + 1) } });
  for (const [i, id] of orderedIds.entries())
    await tx.tourStep.update({ where: { id }, data: { stepOrder: i + 1 } });
}

async function orderedStepIds(tx: Tx, tourId: string): Promise<string[]> {
  const rows = await tx.tourStep.findMany({
    where: { tourId },
    orderBy: { stepOrder: "asc" },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

export async function listSteps(userId: string, tourId: string) {
  await ownTour(userId, tourId);
  return db.tourStep.findMany({
    where: { tourId },
    orderBy: { stepOrder: "asc" },
    select: stepSelect,
  });
}

export async function getStep(userId: string, stepId: string) {
  await ownStep(userId, stepId);
  return db.tourStep.findUniqueOrThrow({ where: { id: stepId }, select: stepSelect });
}

export async function createStep(userId: string, tourId: string, input: CreateStepInput) {
  await ownTour(userId, tourId);
  const { stepOrder, ...fields } = input;
  return db.$transaction(async (tx) => {
    const ids = await orderedStepIds(tx, tourId);
    if (ids.length >= LIMITS.stepsPerTour)
      throw new ApiError(
        422,
        "VALIDATION_ERROR",
        `A tour can have at most ${LIMITS.stepsPerTour} steps.`,
      );
    const position = clampInsertPosition(ids.length, stepOrder);
    // Temporary order far below anything applyOrder uses; replaced immediately.
    const temp = -(1_000_000 + Math.floor(Math.random() * 1_000_000));
    const created = await tx.tourStep.create({
      data: { ...fields, tourId, stepOrder: temp },
      select: { id: true },
    });
    await applyOrder(tx, insertAtPosition(ids, created.id, position));
    await tx.tour.update({ where: { id: tourId }, data: { updatedAt: new Date() } });
    return tx.tourStep.findUniqueOrThrow({ where: { id: created.id }, select: stepSelect });
  });
}

export async function updateStep(userId: string, stepId: string, input: UpdateStepInput) {
  const { tourId } = await ownStep(userId, stepId);
  const { stepOrder, ...fields } = input;
  return db.$transaction(async (tx) => {
    const current = await tx.tourStep.findUniqueOrThrow({
      where: { id: stepId },
      select: { title: true, description: true, stepOrder: true },
    });
    const merged = {
      title: fields.title ?? current.title,
      description: fields.description ?? current.description,
    };
    if (!titleOrDescription(merged))
      throw badRequest("Some fields are invalid.", [
        { path: "title", message: "Add a title or a description." },
      ]);

    if (Object.keys(fields).length)
      await tx.tourStep.update({ where: { id: stepId }, data: fields });
    if (stepOrder !== undefined && stepOrder !== current.stepOrder) {
      const ids = await orderedStepIds(tx, tourId);
      await applyOrder(tx, moveToPosition(ids, stepId, stepOrder));
    }
    await tx.tour.update({ where: { id: tourId }, data: { updatedAt: new Date() } });
    return tx.tourStep.findUniqueOrThrow({ where: { id: stepId }, select: stepSelect });
  });
}

export async function deleteStep(userId: string, stepId: string) {
  const { tourId } = await ownStep(userId, stepId);
  await db.$transaction(async (tx) => {
    await tx.tourStep.delete({ where: { id: stepId } });
    await applyOrder(tx, await orderedStepIds(tx, tourId));
    await tx.tour.update({ where: { id: tourId }, data: { updatedAt: new Date() } });
  });
}

export async function reorderSteps(userId: string, tourId: string, stepIds: string[]) {
  await ownTour(userId, tourId);
  return db.$transaction(async (tx) => {
    const existing = await orderedStepIds(tx, tourId);
    const err = validateReorder(existing, stepIds);
    if (err) throw badRequest(err, [{ path: "stepIds", message: err }]);
    await applyOrder(tx, stepIds);
    await tx.tour.update({ where: { id: tourId }, data: { updatedAt: new Date() } });
    return tx.tourStep.findMany({
      where: { tourId },
      orderBy: { stepOrder: "asc" },
      select: stepSelect,
    });
  });
}
