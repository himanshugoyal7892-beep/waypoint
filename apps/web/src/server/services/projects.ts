import "server-only";
import { Prisma } from "@prisma/client";
import type { CreateProjectInput, UpdateProjectInput } from "@waypoint/shared";
import { generatePublicKey } from "../crypto";
import { db } from "../db";
import { ownProject } from "../ownership";

export const projectSelect = {
  id: true,
  name: true,
  domain: true,
  allowedOrigins: true,
  publicKey: true,
  identitySource: true,
  identityKey: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProjectSelect;

export async function listProjects(userId: string) {
  return db.project.findMany({
    where: { createdById: userId },
    orderBy: { createdAt: "desc" },
    select: {
      ...projectSelect,
      _count: { select: { tours: true } },
      tours: { where: { status: "PUBLISHED" }, select: { id: true } },
    },
  });
}

export async function createProject(userId: string, input: CreateProjectInput) {
  // Retry on the (astronomically unlikely) public key collision.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.project.create({
        data: { ...input, publicKey: generatePublicKey(), createdById: userId },
        select: projectSelect,
      });
    } catch (err) {
      const collided =
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002" &&
        String(err.meta?.target ?? "").includes("publicKey");
      if (!collided || attempt === 2) throw err;
    }
  }
  throw new Error("unreachable");
}

export async function getProject(userId: string, projectId: string) {
  await ownProject(userId, projectId);
  return db.project.findUniqueOrThrow({
    where: { id: projectId },
    select: {
      ...projectSelect,
      tours: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          status: true,
          updatedAt: true,
          _count: { select: { steps: true } },
        },
      },
    },
  });
}

export async function updateProject(userId: string, projectId: string, input: UpdateProjectInput) {
  await ownProject(userId, projectId);
  return db.project.update({ where: { id: projectId }, data: input, select: projectSelect });
}

export async function deleteProject(userId: string, projectId: string) {
  await ownProject(userId, projectId);
  await db.project.delete({ where: { id: projectId } });
}
