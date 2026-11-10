import { generateAccessToken, generateBuilderPass, sha256Hex } from "../crypto";

/**
 * Builder pass lifecycle (approved decisions 13–14):
 *
 *   issue  → dashboard creates a random pass, stores only its SHA-256, returns a launch URL
 *            with the pass in the URL FRAGMENT (never sent to servers or Referer headers).
 *   redeem → the SDK on the customer site POSTs the pass once from an allowed origin and
 *            receives a bearer access token. The conditional update makes this single-use
 *            even under concurrent redemption.
 *   use    → builder API calls send `Authorization: Bearer <token>` until expiresAt
 *            (issue time + TTL, max 2 h) or revocation.
 *
 * This module is storage-agnostic so it can be unit-tested without a database.
 */

export type BuilderModeValue = "BUILD" | "PREVIEW";

export interface BuilderSessionRecord {
  id: string;
  projectId: string;
  tourId: string | null;
  mode: BuilderModeValue;
  targetOrigin: string;
  expiresAt: Date;
  redeemedAt: Date | null;
  revokedAt: Date | null;
}

export interface BuilderPassStore {
  create(data: {
    passHash: string;
    projectId: string;
    tourId: string | null;
    mode: BuilderModeValue;
    targetOrigin: string;
    createdById: string;
    expiresAt: Date;
  }): Promise<{ id: string }>;
  findByPassHash(passHash: string): Promise<BuilderSessionRecord | null>;
  /** Atomically marks the pass redeemed iff unredeemed, unrevoked and unexpired. */
  consume(passHash: string, accessTokenHash: string, now: Date): Promise<boolean>;
  findByAccessTokenHash(accessTokenHash: string): Promise<BuilderSessionRecord | null>;
  touch(id: string, now: Date): Promise<void>;
}

export type BuilderPassFailure =
  | "unknown"
  | "expired"
  | "used"
  | "revoked"
  | "origin_mismatch"
  | "not_redeemed";

/** Carries the precise reason for tests/metrics; clients always get one generic message. */
export class BuilderPassError extends Error {
  constructor(public readonly reason: BuilderPassFailure) {
    super(`Builder pass rejected: ${reason}`);
    this.name = "BuilderPassError";
  }
}

export const MAX_TTL_MINUTES = 120;

export function passStatus(
  rec: BuilderSessionRecord,
  now: Date,
): "valid" | "expired" | "used" | "revoked" {
  if (rec.revokedAt) return "revoked";
  if (rec.expiresAt.getTime() <= now.getTime()) return "expired";
  if (rec.redeemedAt) return "used";
  return "valid";
}

export async function issuePass(
  store: BuilderPassStore,
  input: {
    projectId: string;
    tourId: string | null;
    mode: BuilderModeValue;
    targetOrigin: string;
    createdById: string;
    ttlMinutes: number;
    now: Date;
  },
) {
  const ttl = Math.min(Math.max(1, input.ttlMinutes), MAX_TTL_MINUTES);
  const pass = generateBuilderPass();
  const expiresAt = new Date(input.now.getTime() + ttl * 60_000);
  const { id } = await store.create({
    passHash: sha256Hex(pass),
    projectId: input.projectId,
    tourId: input.tourId,
    mode: input.mode,
    targetOrigin: input.targetOrigin,
    createdById: input.createdById,
    expiresAt,
  });
  return { id, pass, expiresAt };
}

export async function redeemPass(
  store: BuilderPassStore,
  pass: string,
  requestOrigin: string | null,
  now: Date,
) {
  const passHash = sha256Hex(pass);
  const rec = await store.findByPassHash(passHash);
  if (!rec) throw new BuilderPassError("unknown");
  const status = passStatus(rec, now);
  if (status !== "valid") throw new BuilderPassError(status);
  if (!requestOrigin || requestOrigin !== rec.targetOrigin)
    throw new BuilderPassError("origin_mismatch");

  const accessToken = generateAccessToken();
  // The store's conditional update is the real single-use guarantee (handles races).
  const won = await store.consume(passHash, sha256Hex(accessToken), now);
  if (!won) throw new BuilderPassError("used");
  return { session: rec, accessToken };
}

export async function authenticateAccessToken(
  store: BuilderPassStore,
  token: string | null,
  requestOrigin: string | null,
  now: Date,
) {
  if (!token || !/^wpa_[A-Za-z0-9_-]{43}$/.test(token)) throw new BuilderPassError("unknown");
  const rec = await store.findByAccessTokenHash(sha256Hex(token));
  if (!rec) throw new BuilderPassError("unknown");
  if (rec.revokedAt) throw new BuilderPassError("revoked");
  if (rec.expiresAt.getTime() <= now.getTime()) throw new BuilderPassError("expired");
  if (!rec.redeemedAt) throw new BuilderPassError("not_redeemed");
  if (!requestOrigin || requestOrigin !== rec.targetOrigin)
    throw new BuilderPassError("origin_mismatch");
  await store.touch(rec.id, now);
  return rec;
}

/** Launch URL with the pass in the fragment. Any fragment on targetUrl is replaced. */
export function buildLaunchUrl(
  targetUrl: string,
  opts: {
    mode: BuilderModeValue;
    publicKey: string;
    tourId: string | null;
    pass: string;
    builderParam: string;
    previewParam: string;
    hashParam: string;
  },
): string {
  const url = new URL(targetUrl);
  url.searchParams.set(opts.builderParam, opts.publicKey);
  if (opts.mode === "PREVIEW" && opts.tourId) url.searchParams.set(opts.previewParam, opts.tourId);
  const hash = new URLSearchParams({ [opts.hashParam]: opts.pass });
  if (opts.tourId) hash.set("tour", opts.tourId);
  url.hash = hash.toString();
  return url.toString();
}
