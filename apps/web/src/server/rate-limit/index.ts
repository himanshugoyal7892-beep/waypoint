import "server-only";
import { sha256Hex } from "../crypto";
import { env } from "../env";
import { ApiError } from "../http/errors";
import { MemoryRateLimiter } from "./memory";
import type { RateLimitPolicy, RateLimiter } from "./types";
import { UpstashRateLimiter } from "./upstash";

export const POLICIES = {
  public_tours: { limit: 120, windowMs: 60_000 },
  public_events: { limit: 60, windowMs: 60_000 },
  public_visits: { limit: 120, windowMs: 60_000 },
  /** Coarse per-IP cap applied before the body is parsed. */
  public_ip: { limit: 240, windowMs: 60_000 },
  builder: { limit: 300, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitPolicy>;

export type PolicyName = keyof typeof POLICIES;

const limiters = new Map<PolicyName, RateLimiter>();

function limiterFor(name: PolicyName): RateLimiter {
  let l = limiters.get(name);
  if (!l) {
    const e = env();
    l =
      e.RATE_LIMIT_DRIVER === "upstash"
        ? new UpstashRateLimiter(POLICIES[name], name, {
            url: e.UPSTASH_REDIS_REST_URL!,
            token: e.UPSTASH_REDIS_REST_TOKEN!,
          })
        : new MemoryRateLimiter(POLICIES[name]);
    limiters.set(name, l);
  }
  return l;
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Throws 429 when over the limit. The key is hashed so raw IPs never sit in Redis keys.
 * IPs are never written to the database.
 */
export async function enforceRateLimit(
  name: PolicyName,
  req: Request,
  scope: string,
  extraHeaders: Record<string, string> = {},
) {
  const key = sha256Hex(`${clientIp(req)}|${scope}`).slice(0, 32);
  const r = await limiterFor(name).limit(key);
  if (!r.success) {
    const retryAfter = Math.max(1, Math.ceil((r.resetAt - Date.now()) / 1000));
    throw new ApiError(429, "RATE_LIMITED", "Too many requests. Please slow down.", undefined, {
      ...extraHeaders,
      "Retry-After": String(retryAfter),
    });
  }
}
