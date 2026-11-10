import "server-only";
import {
  PRODUCT,
  normalizeOrigin,
  type BuilderPassResponse,
  type BuilderRedeemResponse,
  type CreateBuilderPassInput,
} from "@waypoint/shared";
import { db } from "../db";
import { env } from "../env";
import { ApiError, notFound } from "../http/errors";
import { ownProject, ownTour } from "../ownership";
import {
  BuilderPassError,
  authenticateAccessToken,
  buildLaunchUrl,
  issuePass,
  redeemPass,
  type BuilderPassStore,
  type BuilderSessionRecord,
} from "./core";

const recordSelect = {
  id: true,
  projectId: true,
  tourId: true,
  mode: true,
  targetOrigin: true,
  expiresAt: true,
  redeemedAt: true,
  revokedAt: true,
} as const;

export const prismaPassStore: BuilderPassStore = {
  async create(data) {
    return db.builderSession.create({ data, select: { id: true } });
  },
  async findByPassHash(passHash) {
    return db.builderSession.findUnique({ where: { passHash }, select: recordSelect });
  },
  async consume(passHash, accessTokenHash, now) {
    const r = await db.builderSession.updateMany({
      where: { passHash, redeemedAt: null, revokedAt: null, expiresAt: { gt: now } },
      data: { redeemedAt: now, accessTokenHash, lastUsedAt: now },
    });
    return r.count === 1;
  },
  async findByAccessTokenHash(accessTokenHash) {
    return db.builderSession.findUnique({ where: { accessTokenHash }, select: recordSelect });
  },
  async touch(id, now) {
    await db.builderSession.update({ where: { id }, data: { lastUsedAt: now } });
  },
};

/** One message for every failure reason, so callers can't probe pass state. */
const invalidPass = () =>
  new ApiError(
    401,
    "BUILDER_PASS_INVALID",
    "This builder link is invalid, expired or already used. Open the builder again from your dashboard.",
  );

export async function createBuilderPass(
  userId: string,
  projectId: string,
  input: CreateBuilderPassInput,
): Promise<BuilderPassResponse> {
  await ownProject(userId, projectId);
  if (input.tourId) {
    const tour = await ownTour(userId, input.tourId);
    if (tour.projectId !== projectId) throw notFound("Tour");
  }
  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { publicKey: true, allowedOrigins: true },
  });
  const targetOrigin = normalizeOrigin(new URL(input.targetUrl).origin);
  if (!targetOrigin || !project.allowedOrigins.includes(targetOrigin))
    throw new ApiError(
      422,
      "VALIDATION_ERROR",
      "The builder can only open on one of the project's allowed origins.",
      [
        {
          path: "targetUrl",
          message: `Add ${targetOrigin ?? "this origin"} to the project's allowed origins first, or choose an allowed URL.`,
        },
      ],
    );

  const { id, pass, expiresAt } = await issuePass(prismaPassStore, {
    projectId,
    tourId: input.tourId ?? null,
    mode: input.mode,
    targetOrigin,
    createdById: userId,
    ttlMinutes: env().BUILDER_PASS_TTL_MINUTES,
    now: new Date(),
  });
  const launchUrl = buildLaunchUrl(input.targetUrl, {
    mode: input.mode,
    publicKey: project.publicKey,
    tourId: input.tourId ?? null,
    pass,
    builderParam: PRODUCT.sdk.builderQueryParam,
    previewParam: PRODUCT.sdk.previewQueryParam,
    hashParam: PRODUCT.sdk.builderPassHashParam,
  });
  return { id, mode: input.mode, launchUrl, expiresAt: expiresAt.toISOString() };
}

export async function revokeBuilderSession(userId: string, sessionId: string) {
  const s = await db.builderSession.findFirst({
    where: { id: sessionId, project: { createdById: userId } },
    select: { id: true },
  });
  if (!s) throw notFound("Builder session");
  await db.builderSession.update({ where: { id: s.id }, data: { revokedAt: new Date() } });
}

/** Re-checks that the session's origin is still allowed (origins may have been edited). */
async function assertOriginStillAllowed(rec: BuilderSessionRecord) {
  const p = await db.project.findUnique({
    where: { id: rec.projectId },
    select: { allowedOrigins: true },
  });
  if (!p || !p.allowedOrigins.includes(rec.targetOrigin)) throw invalidPass();
}

export async function redeemBuilderPass(
  pass: string,
  origin: string | null,
): Promise<BuilderRedeemResponse> {
  try {
    const { session, accessToken } = await redeemPass(prismaPassStore, pass, origin, new Date());
    await assertOriginStillAllowed(session);
    const project = await db.project.findUniqueOrThrow({
      where: { id: session.projectId },
      select: { id: true, name: true, publicKey: true },
    });
    return {
      accessToken,
      expiresAt: session.expiresAt.toISOString(),
      mode: session.mode,
      tourId: session.tourId,
      project,
    };
  } catch (err) {
    if (err instanceof BuilderPassError) throw invalidPass();
    throw err;
  }
}

export async function authenticateBuilder(token: string | null, origin: string | null) {
  try {
    const rec = await authenticateAccessToken(prismaPassStore, token, origin, new Date());
    await assertOriginStillAllowed(rec);
    return rec;
  } catch (err) {
    if (err instanceof BuilderPassError) throw invalidPass();
    throw err;
  }
}
