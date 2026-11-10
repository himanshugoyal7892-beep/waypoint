import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { RateLimitPolicy, RateLimitResult, RateLimiter } from "./types";

/** Distributed sliding-window limiter for production. */
export class UpstashRateLimiter implements RateLimiter {
  private readonly rl: Ratelimit;

  constructor(policy: RateLimitPolicy, prefix: string, redis: { url: string; token: string }) {
    this.rl = new Ratelimit({
      redis: new Redis({ url: redis.url, token: redis.token }),
      limiter: Ratelimit.slidingWindow(policy.limit, `${Math.ceil(policy.windowMs / 1000)} s`),
      prefix: `waypoint:rl:${prefix}`,
      analytics: false,
    });
  }

  async limit(key: string): Promise<RateLimitResult> {
    const r = await this.rl.limit(key);
    return { success: r.success, limit: r.limit, remaining: r.remaining, resetAt: r.reset };
  }
}
