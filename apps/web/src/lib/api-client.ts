"use client";

import type { ApiErrorBody, ApiErrorDetail, PublishIssue } from "@waypoint/shared";

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: ApiErrorDetail[] | PublishIssue[] = [],
  ) {
    super(message);
  }

  /** Field → message map for form display (first message per field wins). */
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const d of this.details) {
      const key = "path" in d ? d.path : (d.field ?? "");
      if (key && !out[key]) out[key] = d.message;
    }
    return out;
  }
}

/** Same-origin JSON fetch to the admin API with the standard error envelope. */
export async function apiFetch<T = unknown>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: init.method ?? "GET",
      headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new ApiClientError(
      0,
      "NETWORK_ERROR",
      "Couldn't reach the server. Check your connection and try again.",
    );
  }
  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data as ApiErrorBody | null)?.error;
    throw new ApiClientError(
      res.status,
      err?.code ?? "UNKNOWN",
      err?.message ?? `Request failed (${res.status}).`,
      err?.details ?? [],
    );
  }
  return data as T;
}

/** Zod issues → field map, for client-side validation before submitting. */
export function zodFieldErrors(
  issues: { path: (string | number)[]; message: string }[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const key = i.path.join(".") || "_form";
    if (!out[key]) out[key] = i.message;
  }
  return out;
}
