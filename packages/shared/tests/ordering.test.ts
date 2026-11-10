import { describe, expect, it } from "vitest";
import {
  checkSequentialOrders,
  clampInsertPosition,
  insertAtPosition,
  moveToPosition,
  validateReorder,
} from "../src/ordering";

describe("checkSequentialOrders", () => {
  it("accepts 1..N in any input order", () => {
    expect(checkSequentialOrders([1, 2, 3])).toEqual([]);
    expect(checkSequentialOrders([3, 1, 2])).toEqual([]);
  });
  it("flags empty lists, gaps, duplicates and zero-based orders", () => {
    expect(checkSequentialOrders([])[0]?.code).toBe("EMPTY");
    expect(checkSequentialOrders([1, 3]).map((i) => i.code)).toContain("NOT_SEQUENTIAL");
    expect(checkSequentialOrders([1, 2, 2]).map((i) => i.code)).toContain("DUPLICATE_ORDER");
    expect(checkSequentialOrders([0, 1]).map((i) => i.code)).toContain("NOT_SEQUENTIAL");
  });
});

describe("validateReorder", () => {
  const existing = ["a", "b", "c"];
  it("accepts a permutation", () => expect(validateReorder(existing, ["c", "a", "b"])).toBeNull());
  it("rejects missing, extra, unknown and duplicate ids", () => {
    expect(validateReorder(existing, ["a", "b"])).toMatch(/all 3 steps/);
    expect(validateReorder(existing, ["a", "b", "c", "d"])).toMatch(/all 3 steps/);
    expect(validateReorder(existing, ["a", "b", "x"])).toMatch(/Unknown step id/);
    expect(validateReorder(existing, ["a", "a", "b"])).toMatch(/more than once/);
  });
});

describe("positions", () => {
  it("clamps insert positions", () => {
    expect(clampInsertPosition(3)).toBe(4);
    expect(clampInsertPosition(3, 0)).toBe(1);
    expect(clampInsertPosition(3, 2)).toBe(2);
    expect(clampInsertPosition(3, 99)).toBe(4);
  });
  it("moves and inserts", () => {
    expect(moveToPosition(["a", "b", "c"], "c", 1)).toEqual(["c", "a", "b"]);
    expect(moveToPosition(["a", "b", "c"], "a", 3)).toEqual(["b", "c", "a"]);
    expect(moveToPosition(["a", "b", "c"], "b", 50)).toEqual(["a", "c", "b"]);
    expect(insertAtPosition(["a", "b"], "n", 1)).toEqual(["n", "a", "b"]);
    expect(insertAtPosition(["a", "b"], "n", 3)).toEqual(["a", "b", "n"]);
  });
});
