/**
 * Minimal Vitest-compatible shim used ONLY by scripts/offline-check.sh when real dependencies
 * cannot be installed. It implements the subset of describe/it/expect the pure test files use.
 * Results from this shim are reported separately from real Vitest runs.
 */
import { deepStrictEqual } from "node:assert/strict";

type Fn = () => unknown | Promise<unknown>;
interface Test {
  name: string;
  fn: Fn;
}
const tests: Test[] = [];
const prefix: string[] = [];

export function describe(name: string, fn: () => void) {
  prefix.push(name);
  fn();
  prefix.pop();
}
export function it(name: string, fn: Fn) {
  tests.push({ name: [...prefix, name].join(" › "), fn });
}
export const test = it;

function fmt(v: unknown) {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function isSubset(actual: unknown, expected: unknown): boolean {
  if (expected === null || typeof expected !== "object") return Object.is(actual, expected);
  if (actual === null || typeof actual !== "object") return false;
  return Object.entries(expected as Record<string, unknown>).every(([k, v]) =>
    isSubset((actual as Record<string, unknown>)[k], v),
  );
}

function matchers(actual: unknown, negate: boolean, label?: string) {
  const check = (pass: boolean, msg: string) => {
    if (pass === negate)
      throw new Error(`${label ? `[${label}] ` : ""}${negate ? "NOT " : ""}${msg}`);
  };
  return {
    toBe: (e: unknown) => check(Object.is(actual, e), `expected ${fmt(actual)} to be ${fmt(e)}`),
    toEqual: (e: unknown) => {
      let ok = true;
      try {
        deepStrictEqual(
          JSON.parse(JSON.stringify(actual ?? null)),
          JSON.parse(JSON.stringify(e ?? null)),
        );
      } catch {
        ok = false;
      }
      check(ok, `expected ${fmt(actual)} to equal ${fmt(e)}`);
    },
    toBeNull: () => check(actual === null, `expected ${fmt(actual)} to be null`),
    toBeUndefined: () => check(actual === undefined, `expected ${fmt(actual)} to be undefined`),
    toBeTruthy: () => check(Boolean(actual), `expected ${fmt(actual)} to be truthy`),
    toMatch: (re: RegExp | string) =>
      check(
        typeof actual === "string" &&
          (typeof re === "string" ? actual.includes(re) : re.test(actual)),
        `expected ${fmt(actual)} to match ${String(re)}`,
      ),
    toContain: (e: unknown) =>
      check(
        (Array.isArray(actual) || typeof actual === "string") &&
          (actual as unknown[]).includes(e as never),
        `expected ${fmt(actual)} to contain ${fmt(e)}`,
      ),
    toHaveLength: (n: number) =>
      check(
        (actual as { length?: number })?.length === n,
        `expected length ${n}, got ${fmt(actual)}`,
      ),
    toMatchObject: (e: unknown) =>
      check(isSubset(actual, e), `expected ${fmt(actual)} to match object ${fmt(e)}`),
    toBeInstanceOf: (c: new (...a: never[]) => unknown) =>
      check(actual instanceof c, `expected instance of ${c.name}`),
    toBeGreaterThan: (n: number) => check((actual as number) > n, `expected ${fmt(actual)} > ${n}`),
    toBeLessThanOrEqual: (n: number) =>
      check((actual as number) <= n, `expected ${fmt(actual)} <= ${n}`),
    toThrow: (re?: RegExp) => {
      let threw = false;
      let message = "";
      try {
        (actual as () => unknown)();
      } catch (err) {
        threw = true;
        message = err instanceof Error ? err.message : String(err);
      }
      check(
        threw && (!re || re.test(message)),
        `expected function to throw ${re ?? ""} (got ${threw ? message : "no throw"})`,
      );
    },
  };
}

export function expect(actual: unknown, label?: string) {
  const m = matchers(actual, false, label);
  return Object.assign(m, {
    not: matchers(actual, true, label),
    resolves: new Proxy(
      {},
      {
        get:
          (_t, key: string) =>
          async (...args: unknown[]) => {
            const v = await (actual as Promise<unknown>);
            return (matchers(v, false, label) as Record<string, (...a: unknown[]) => unknown>)[
              key
            ]!(...args);
          },
      },
    ) as ReturnType<typeof matchers>,
  });
}

export async function runRegisteredTests(): Promise<{ passed: number; failed: number }> {
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (err) {
      failed++;
      console.log(`  ✗ ${t.name}\n      ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  tests.length = 0;
  return { passed, failed };
}
