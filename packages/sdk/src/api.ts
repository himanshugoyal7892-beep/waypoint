import type { PublicTipTheme, PublicToursResponse } from "@waypoint/shared/api-types";

/** Fetches published tours relevant to `path`. Never sends cookies. */
export async function fetchTours(
  apiBase: string,
  projectKey: string,
  path: string,
  fresh = false,
): Promise<PublicToursResponse> {
  const url =
    `${apiBase}/api/public/v1/projects/${encodeURIComponent(projectKey)}/tours?path=${encodeURIComponent(path)}` +
    (fresh ? `&fresh=${Date.now()}` : "");
  const res = await fetch(url, { method: "GET", mode: "cors", credentials: "omit" });
  if (!res.ok) throw new Error(`tours ${res.status}`);
  const body = (await res.json()) as PublicToursResponse;
  return {
    tours: Array.isArray(body.tours) ? body.tours : [],
    identity: body.identity && typeof body.identity === "object" ? body.identity : null,
    settings: {
      maxAutoToursPerVisit:
        typeof body.settings?.maxAutoToursPerVisit === "number"
          ? body.settings.maxAutoToursPerVisit
          : null,
      themeColor:
        typeof body.settings?.themeColor === "string" &&
        /^#[0-9a-fA-F]{6}$/.test(body.settings.themeColor)
          ? body.settings.themeColor
          : null,
      tip: sanitizeTip(body.settings?.tip),
    },
  };
}

const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;

/** Accepts only known values, so a bad response can't inject CSS. */
function sanitizeTip(raw: unknown): PublicTipTheme {
  const t = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    style: pick(t.style, ["LIGHT", "DARK", "BRAND"] as const, "LIGHT"),
    corners: pick(t.corners, ["ROUNDED", "SOFT", "SQUARE"] as const, "ROUNDED"),
    progress: pick(t.progress, ["COUNTER", "DOTS", "BAR", "NONE"] as const, "COUNTER"),
    font: pick(t.font, ["SYSTEM", "SITE"] as const, "SYSTEM"),
    backdrop: t.backdrop !== false,
  };
}
