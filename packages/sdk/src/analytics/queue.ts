import type { EventName } from "@waypoint/shared";
import { sanitizeTrackedUrl } from "@waypoint/shared/url";
import { randomId } from "../ids";

export interface TrackInput {
  eventName: EventName;
  tourId: string;
  tourVersion: number;
  stepId?: string;
  stepOrder?: number;
  errorCode?: string;
}

interface WireEvent extends TrackInput {
  clientEventId: string;
  anonymousVisitorId: string;
  sessionId: string;
  currentUrl: string;
  timestamp: number;
}

const MAX_BATCH = 20;
const FLUSH_AT = 10;
const FLUSH_MS = 2000;

/**
 * Batches analytics events. Bodies are sent as text/plain JSON so `navigator.sendBeacon`
 * works without a CORS preflight (approved decision 15). Only ids, the event name and the
 * origin + pathname of the page are sent: never page content or form values.
 */
export class EventQueue {
  private queue: WireEvent[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly onHide = () => this.flush(true);
  private readonly onVisibility = () => {
    if (document.visibilityState === "hidden") this.flush(true);
  };

  constructor(
    private readonly endpoint: string,
    private readonly projectKey: string,
    private readonly ids: () => { visitorId: string; sessionId: string },
    private enabled = true,
  ) {
    window.addEventListener("pagehide", this.onHide);
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  track(input: TrackInput) {
    if (!this.enabled) return;
    const currentUrl = sanitizeTrackedUrl(location.href);
    if (!currentUrl) return;
    const { visitorId, sessionId } = this.ids();
    this.queue.push({
      ...input,
      clientEventId: randomId("e_"),
      anonymousVisitorId: visitorId,
      sessionId,
      currentUrl,
      timestamp: Date.now(),
    });
    if (this.queue.length >= FLUSH_AT) this.flush(false);
    else if (!this.timer) this.timer = setTimeout(() => this.flush(false), FLUSH_MS);
  }

  /** Sends everything queued. `unloading` prefers sendBeacon, which survives navigation. */
  flush(unloading: boolean) {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    while (this.queue.length) {
      const batch = this.queue.splice(0, MAX_BATCH);
      this.send(batch, unloading);
    }
  }

  private send(events: WireEvent[], unloading: boolean, retry = true) {
    const body = JSON.stringify({ projectKey: this.projectKey, events });
    if (unloading && typeof navigator.sendBeacon === "function") {
      try {
        if (
          navigator.sendBeacon(
            this.endpoint,
            new Blob([body], { type: "text/plain;charset=UTF-8" }),
          )
        )
          return;
      } catch {
        /* fall through to fetch */
      }
    }
    fetch(this.endpoint, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      keepalive: true,
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body,
    })
      .then((res) => {
        // Retry once on server errors / rate limits; drop on validation errors.
        if (!res.ok && res.status >= 429 && retry)
          setTimeout(() => this.send(events, false, false), 3000);
      })
      .catch(() => {
        if (retry) setTimeout(() => this.send(events, false, false), 3000);
      });
  }

  destroy() {
    this.flush(true);
    window.removeEventListener("pagehide", this.onHide);
    document.removeEventListener("visibilitychange", this.onVisibility);
  }
}
