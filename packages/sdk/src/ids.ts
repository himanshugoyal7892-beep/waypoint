import type { KeyValueStore } from "./storage";

/** Random URL-safe id matching the server's OPAQUE_ID_PATTERN (8–64 chars). */
export function randomId(prefix = ""): string {
  const c = typeof crypto !== "undefined" ? crypto : undefined;
  if (c?.randomUUID) return prefix + c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return prefix + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Anonymous, random visitor id kept in localStorage. No personal data. */
export function visitorId(local: KeyValueStore): string {
  let id = local.get("vid");
  if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
    id = randomId("v_");
    local.set("vid", id);
  }
  return id;
}

export const SESSION_IDLE_MS = 30 * 60 * 1000;

/** Session id in sessionStorage, rotated after 30 minutes without SDK activity. */
export function sessionId(session: KeyValueStore, now: number = Date.now()): string {
  const id = session.get("sid");
  const last = Number(session.get("sid_at") ?? "0");
  const valid = id && /^[A-Za-z0-9_-]{8,64}$/.test(id) && now - last < SESSION_IDLE_MS;
  const result = valid ? id : randomId("s_");
  session.set("sid", result);
  session.set("sid_at", String(now));
  return result;
}
