import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** Unbiased base62 string via rejection sampling (bytes ≥ 248 are discarded). */
export function randomBase62(length: number): string {
  let out = "";
  while (out.length < length) {
    for (const b of randomBytes(length * 2)) {
      if (b < 248) out += BASE62[b % 62];
      if (out.length === length) break;
    }
  }
  return out;
}

/** Project public key: `pk_` + 24 base62 chars (~143 bits). Not a secret. */
export function generatePublicKey(): string {
  return `pk_${randomBase62(24)}`;
}

/** 256-bit secrets, base64url (43 chars). */
export function generateBuilderPass(): string {
  return `wpb_${randomBytes(32).toString("base64url")}`;
}
export function generateAccessToken(): string {
  return `wpa_${randomBytes(32).toString("base64url")}`;
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

export function hmacSha256Hex(key: string, value: string): string {
  return createHmac("sha256", key).update(value, "utf8").digest("hex");
}

/**
 * Stable per-project visitor key. Logged-in users are keyed by the site's own user id so state
 * follows them across devices; everyone else by the anonymous browser id. Raw ids are never stored.
 */
export function visitorKeyFor(salt: string, input: { userId?: string; visitorId: string }): string {
  return hmacSha256Hex(salt, input.userId ? `u:${input.userId}` : `a:${input.visitorId}`);
}
