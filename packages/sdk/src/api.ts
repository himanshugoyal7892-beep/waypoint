import type { PublicTour, PublicToursResponse } from "@waypoint/shared/api-types";

/** Fetches published tours relevant to `path`. Never sends cookies. */
export async function fetchTours(
  apiBase: string,
  projectKey: string,
  path: string,
): Promise<PublicTour[]> {
  const url = `${apiBase}/api/public/v1/projects/${encodeURIComponent(projectKey)}/tours?path=${encodeURIComponent(path)}`;
  const res = await fetch(url, { method: "GET", mode: "cors", credentials: "omit" });
  if (!res.ok) throw new Error(`tours ${res.status}`);
  const body = (await res.json()) as PublicToursResponse;
  return Array.isArray(body.tours) ? body.tours : [];
}
