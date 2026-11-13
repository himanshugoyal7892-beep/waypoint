import { PRODUCT } from "@waypoint/shared/product-config";
import { EventQueue } from "./analytics/queue";
import { fetchTours } from "./api";
import { readConfig } from "./config";
import { sessionId, visitorId } from "./ids";
import { TourEngine } from "./runtime/engine";
import { safeStore } from "./storage";
import { watchUrl } from "./url/watch";
import { navigateTo } from "./navigate";
import { VisitClient } from "./visits";

export const VERSION = "0.5.0";

declare global {
  interface Window {
    ProductTourConfig?: {
      projectId?: string;
      apiBase?: string;
      debug?: boolean;
      builder?: boolean;
      /** Set by the preview bookmark: plays tours for the presenter, ignoring targeting rules. */
      preview?: boolean;
    };
    ProductTour?: {
      version: string;
      start(tourId: string): Promise<boolean>;
      stop(): void;
      reset(): void;
      destroy(): void;
      /**
       * Tells Waypoint who is logged in, for targeting (new / returning / existing users).
       * Only needed on sites that can't use the no-code "who is this user" setting.
       */
      identify(userId: string | number | null, traits?: { signedUpAt?: string | Date }): void;
    };
    __ptourLoaded?: boolean;
  }
}

// Captured synchronously: document.currentScript is only set while this script executes.
const scriptSrc = (document.currentScript as HTMLScriptElement | null)?.src ?? null;

export function boot(): void {
  if (window.__ptourLoaded) return; // snippet included twice
  window.__ptourLoaded = true;

  const config = readConfig(window.ProductTourConfig, scriptSrc);
  if (!config) {
    console.warn(
      `[${PRODUCT.name}] Missing or invalid ProductTourConfig.projectId; tours are disabled.`,
    );
    return;
  }
  const log = config.debug ? (m: string) => console.warn(`[${PRODUCT.name}] ${m}`) : undefined;

  const params = new URLSearchParams(location.search);
  const wantsBuilder =
    params.has(PRODUCT.sdk.builderQueryParam) ||
    params.has(PRODUCT.sdk.previewQueryParam) ||
    window.ProductTourConfig?.builder === true;
  if (wantsBuilder) {
    // Builder mode: visitor tours don't run; the builder bundle is loaded on demand.
    loadBuilder(config.apiBase, config.projectKey, params.get(PRODUCT.sdk.previewQueryParam));
    return;
  }

  const local = safeStore("local");
  const session = safeStore("session");
  const visits = new VisitClient(config.apiBase, config.projectKey, local, session);
  const analytics = new EventQueue(
    `${config.apiBase}/api/public/v1/events`,
    config.projectKey,
    () => ({
      visitorId: visitorId(local),
      sessionId: sessionId(session),
      visitorKey: visits.visitorKey,
    }),
  );
  const engine = new TourEngine({
    loadTours: async (path) => {
      const res = await fetchTours(config.apiBase, config.projectKey, path);
      visits.setIdentityConfig(res.identity);
      return res.tours;
    },
    ...(window.ProductTourConfig?.preview === true
      ? {}
      : { eligibleTours: () => visits.eligible() }),
    analytics,
    local,
    session,
    navigate: (path) => navigateTo(path),
    log,
  });
  // ?tour_start=<id>: a link that opens the page with a tour running. Read it, then remove it
  // from the address bar so a reload doesn't restart the tour.
  const linkedTour = params.get(PRODUCT.sdk.startQueryParam);
  if (linkedTour) {
    try {
      const url = new URL(location.href);
      url.searchParams.delete(PRODUCT.sdk.startQueryParam);
      history.replaceState(history.state, "", url.toString());
    } catch {
      /* address bar left as is */
    }
  }

  const stopWatching = watchUrl(() => void engine.evaluate());

  window.ProductTour = {
    version: VERSION,
    start: (tourId) => engine.start(String(tourId)),
    stop: () => engine.stop(),
    reset: () => engine.reset(),
    identify: (userId, traits) => {
      const id = userId === null || userId === undefined ? "" : String(userId).trim();
      let signedUpAt: string | undefined;
      if (traits?.signedUpAt) {
        const d = new Date(traits.signedUpAt);
        if (!Number.isNaN(d.getTime())) signedUpAt = d.toISOString();
      }
      visits.identify(
        id ? { userId: id.slice(0, 200), ...(signedUpAt ? { signedUpAt } : {}) } : null,
      );
      if (!engine.isActive) void engine.evaluate();
    },
    destroy: () => {
      engine.destroy();
      stopWatching();
      analytics.destroy();
      window.__ptourLoaded = false;
    },
  };

  const run = () => {
    if (linkedTour && /^[A-Za-z0-9_-]{1,64}$/.test(linkedTour))
      void engine.start(linkedTour).then((ok) => {
        if (!ok) void engine.evaluate();
      });
    else void engine.evaluate();
  };
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", run, { once: true });
  else run();
}

function loadBuilder(apiBase: string, projectKey: string, tourId: string | null) {
  if (window.__ptourBuilderActive) return;
  window.__ptourBuilderInit = { apiBase, projectKey, tourId };
  const s = document.createElement("script");
  s.async = true;
  s.src = `${apiBase}/sdk/product-tour-builder.js?v=${VERSION}`;
  (document.head || document.documentElement).appendChild(s);
}

try {
  boot();
} catch (err) {
  // Never break the host page.
  console.warn(`[${PRODUCT.name}] failed to start`, err);
}
