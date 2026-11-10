import "server-only";
import { notFound } from "next/navigation";
import { ApiError } from "@/server/http/errors";

/** Runs a service call from a page; ownership/missing errors render the 404 page. */
export async function loadOr404<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
}
