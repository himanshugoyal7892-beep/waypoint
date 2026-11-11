import { PRODUCT } from "@waypoint/shared/product-config";
import { EventQueue } from "./analytics/queue";
import { fetchTours } from "./api";
import { readConfig } from "./config";
import { sessionId, visitorId } from "./ids";
import { TourEngine } from "./runtime/engine";
import { safeStore } from "./storage";
import { watchUrl } from "./url/watch";
import { navigateTo } from "./navigate";

export const VERSION = "0.4.0";

declare global {
  interface Window {
    ProductTourConfig?: {
      projectId?: string;
      apiBase?: string;
      debug?: boolean;
      builder?: boolean;
    };
    ProductTour?: {
      version: string;
      start(tourId: string): Promise<boolean>;
      stop(): void;
      reset(): void;
      destroy(): void;
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
  const analytics = new EventQueue(
    `${config.apiBase}/api/public/v1/events`,
    config.projectKey,
    () => ({
      visitorId: visitorId(local),
      sessionId: sessionId(session),
    }),
  );
  const engine = new TourEngine({
    loadTours: (path) => fetchTours(config.apiBase, config.projectKey, path),
    analytics,
    local,
    session,
    navigate: (path) => navigateTo(path),
    log,
  });
  const stopWatching = watchUrl(() => void engine.evaluate());

  window.ProductTour = {
    version: VERSION,
    start: (tourId) => engine.start(String(tourId)),
    stop: () => engine.stop(),
    reset: () => engine.reset(),
    destroy: () => {
      engine.destroy();
      stopWatching();
      analytics.destroy();
      window.__ptourLoaded = false;
    },
  };

  const run = () => void engine.evaluate();
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
