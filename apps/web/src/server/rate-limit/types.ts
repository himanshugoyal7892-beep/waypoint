/**
 * Replaceable rate-limiting adapter. `MemoryRateLimiter` is for local development only
 * (state is per process, so on Vercel each instance has its own counters). Production
 * uses `UpstashRateLimiter` (RATE_LIMIT_DRIVER=upstash) or any other distributed store
 * implementing this interface.
 */
export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  /** Epoch ms when the current window resets. */
  resetAt: number;
}

export interface RateLimiter {
  limit(key: string): Promise<RateLimitResult>;
}

export interface RateLimitPolicy {
  /** Requests allowed per window. */
  limit: number;
  windowMs: number;
}
