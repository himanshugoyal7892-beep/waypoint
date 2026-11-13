import type { PublicIdentityConfig, VisitResponse } from "@waypoint/shared/api-types";
import { VISITOR_KEY_PATTERN } from "@waypoint/shared/limits";
import { sessionId, visitorId } from "./ids";
import { waitForUserId } from "./identity";
import { readJson, type KeyValueStore } from "./storage";

interface CachedVisit {
  sid: string;
  uid: string | null;
  vk: string;
  ids: string[];
}

export interface Identified {
  userId: string;
  signedUpAt?: string;
}

/**
 * Asks the server which automatic tours this visitor may see, once per visit (cached in
 * sessionStorage per user). Returns null if the server can't be reached, so the engine falls
 * back to the original "once per browser" behaviour instead of showing nothing.
 */
export class VisitClient {
  private identity: PublicIdentityConfig | null = null;
  private manual: Identified | null = null;
  private inflight: Promise<Set<string> | null> | null = null;

  constructor(
    private readonly apiBase: string,
    private readonly projectKey: string,
    private readonly local: KeyValueStore,
    private readonly session: KeyValueStore,
  ) {}

  setIdentityConfig(config: PublicIdentityConfig | null) {
    this.identity = config;
  }

  /** ProductTour.identify(): takes priority over the project's no-code setting. */
  identify(user: Identified | null) {
    this.manual = user;
    this.session.remove("visit");
  }

  /** Hashed key for analytics, once the server has issued one this session. */
  get visitorKey(): string | undefined {
    const vk = readJson<CachedVisit>(this.session, "visit")?.vk;
    return vk && VISITOR_KEY_PATTERN.test(vk) ? vk : undefined;
  }

  eligible(): Promise<Set<string> | null> {
    this.inflight ??= this.load().finally(() => (this.inflight = null));
    return this.inflight;
  }

  private async load(): Promise<Set<string> | null> {
    const userId = this.manual?.userId ?? (await waitForUserId(this.identity));
    const sid = sessionId(this.session);
    const cached = readJson<CachedVisit>(this.session, "visit");
    if (cached && cached.sid === sid && cached.uid === userId && Array.isArray(cached.ids))
      return new Set(cached.ids);
    try {
      const res = await fetch(`${this.apiBase}/api/public/v1/visits`, {
        method: "POST",
        mode: "cors",
        credentials: "omit",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          projectKey: this.projectKey,
          visitorId: visitorId(this.local),
          ...(userId ? { userId } : {}),
          ...(this.manual?.signedUpAt ? { signedUpAt: this.manual.signedUpAt } : {}),
        }),
      });
      if (!res.ok) return null;
      const body = (await res.json()) as VisitResponse;
      const ids = Array.isArray(body.eligibleTourIds) ? body.eligibleTourIds.map(String) : [];
      this.session.set(
        "visit",
        JSON.stringify({ sid, uid: userId, vk: body.visitorKey, ids } satisfies CachedVisit),
      );
      return new Set(ids);
    } catch {
      return null;
    }
  }
}
