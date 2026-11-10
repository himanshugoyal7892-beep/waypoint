/** Step-ordering rules. Step orders are 1-based and contiguous: 1, 2, …, N. */

export interface OrderIssue {
  code: "EMPTY" | "NOT_SEQUENTIAL" | "DUPLICATE_ORDER";
  message: string;
  order?: number;
}

/** Checks that the orders are exactly {1..N} with no duplicates (input order irrelevant). */
export function checkSequentialOrders(orders: readonly number[]): OrderIssue[] {
  if (orders.length === 0) return [{ code: "EMPTY", message: "The tour has no steps." }];
  const issues: OrderIssue[] = [];
  const seen = new Set<number>();
  for (const o of orders) {
    if (seen.has(o))
      issues.push({
        code: "DUPLICATE_ORDER",
        order: o,
        message: `More than one step uses position ${o}.`,
      });
    seen.add(o);
  }
  const sorted = [...seen].sort((a, b) => a - b);
  sorted.forEach((o, i) => {
    if (o !== i + 1)
      issues.push({
        code: "NOT_SEQUENTIAL",
        order: o,
        message: `Step positions must run 1 to ${orders.length} without gaps; found position ${o} where ${i + 1} was expected.`,
      });
  });
  return issues;
}

/**
 * Validates a reorder request: `requested` must be a permutation of `existing`.
 * Returns an error message or null.
 */
export function validateReorder(
  existing: readonly string[],
  requested: readonly string[],
): string | null {
  if (new Set(requested).size !== requested.length)
    return "The new order lists a step more than once.";
  if (requested.length !== existing.length)
    return `The new order must list all ${existing.length} steps exactly once (got ${requested.length}).`;
  const have = new Set(existing);
  const unknown = requested.filter((id) => !have.has(id));
  if (unknown.length) return `Unknown step id(s) for this tour: ${unknown.join(", ")}.`;
  return null;
}

/** Clamps a requested 1-based insert position to [1, count + 1]. Undefined → append. */
export function clampInsertPosition(count: number, requested?: number): number {
  if (requested === undefined || !Number.isFinite(requested)) return count + 1;
  return Math.min(Math.max(1, Math.trunc(requested)), count + 1);
}

/** Returns a new array with `id` moved to 1-based `position` (clamped). */
export function moveToPosition<T>(ids: readonly T[], id: T, position: number): T[] {
  const without = ids.filter((x) => x !== id);
  const index = Math.min(Math.max(0, Math.trunc(position) - 1), without.length);
  without.splice(index, 0, id);
  return without;
}

/** Returns a new array with `id` inserted at 1-based `position` (clamped). */
export function insertAtPosition<T>(ids: readonly T[], id: T, position: number): T[] {
  return moveToPosition([...ids, id], id, position);
}
