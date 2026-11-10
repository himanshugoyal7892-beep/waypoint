import { PUBLIC_KEY_PATTERN } from "@waypoint/shared/limits";

export interface SdkConfig {
  projectKey: string;
  apiBase: string;
  debug: boolean;
}

interface RawConfig {
  projectId?: unknown;
  apiBase?: unknown;
  debug?: unknown;
}

/**
 * Reads window.ProductTourConfig. The API base defaults to the origin the script was loaded
 * from, so one environment variable (the SDK URL in the snippet) controls everything.
 */
export function readConfig(raw: RawConfig | undefined, scriptSrc: string | null): SdkConfig | null {
  const projectKey = typeof raw?.projectId === "string" ? raw.projectId.trim() : "";
  if (!PUBLIC_KEY_PATTERN.test(projectKey)) return null;
  let apiBase = typeof raw?.apiBase === "string" ? raw.apiBase : "";
  if (!apiBase && scriptSrc) {
    try {
      apiBase = new URL(scriptSrc, location.href).origin;
    } catch {
      apiBase = "";
    }
  }
  if (!apiBase) apiBase = location.origin;
  return { projectKey, apiBase: apiBase.replace(/\/+$/, ""), debug: raw?.debug === true };
}
