import type { RateLimitPolicy, RateLimitResult, RateLimiter } from "./types";

/** Fixed-window counter in process memory. Development only (see types.ts). */
export class MemoryRateLimiter implements RateLimiter {
  private readonly windows = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly policy: RateLimitPolicy,
    private readonly now: () => number = Date.now,
    private readonly maxKeys = 10_000,
  ) {}

  async limit(key: string): Promise<RateLimitResult> {
    const now = this.now();
    let w = this.windows.get(key);
    if (!w || w.resetAt <= now) {
      if (this.windows.size >= this.maxKeys) this.evict(now);
      w = { count: 0, resetAt: now + this.policy.windowMs };
      this.windows.set(key, w);
    }
    w.count++;
    const success = w.count <= this.policy.limit;
    return {
      success,
      limit: this.policy.limit,
      remaining: Math.max(0, this.policy.limit - w.count),
      resetAt: w.resetAt,
    };
  }

  /** Drops expired windows. If still full, drops the oldest entries (bounded memory). */
  private evict(now: number) {
    for (const [k, v] of this.windows) if (v.resetAt <= now) this.windows.delete(k);
    const excess = this.windows.size - this.maxKeys + 1;
    if (excess > 0) {
      let i = 0;
      for (const k of this.windows.keys()) {
        if (i++ >= excess) break;
        this.windows.delete(k);
      }
    }
  }

  /** Test helper. */
  get size() {
    return this.windows.size;
  }
}
