import { describe, expect, it } from "vitest";
import { MemoryRateLimiter } from "@/server/rate-limit/memory";

describe("MemoryRateLimiter", () => {
  it("allows up to the limit per window, then blocks, then resets", async () => {
    let now = 1_000;
    const rl = new MemoryRateLimiter({ limit: 3, windowMs: 1_000 }, () => now);
    const results = [];
    for (let i = 0; i < 4; i++) results.push((await rl.limit("k")).success);
    expect(results).toEqual([true, true, true, false]);
    now += 1_000;
    expect((await rl.limit("k")).success).toBe(true);
  });
  it("tracks keys independently and reports remaining", async () => {
    const rl = new MemoryRateLimiter({ limit: 2, windowMs: 60_000 }, () => 0);
    expect((await rl.limit("a")).remaining).toBe(1);
    expect((await rl.limit("b")).remaining).toBe(1);
    expect((await rl.limit("a")).remaining).toBe(0);
  });
  it("keeps memory bounded", async () => {
    const rl = new MemoryRateLimiter({ limit: 1, windowMs: 60_000 }, () => 0, 100);
    for (let i = 0; i < 500; i++) await rl.limit(`k${i}`);
    expect(rl.size).toBeLessThanOrEqual(100);
  });
});
