import { PRODUCT } from "@waypoint/shared/product-config";
import { EventQueue } from "./analytics/queue";
import { fetchTours } from "./api";
import { readConfig } from "./config";
import { sessionId, visitorId } from "./ids";
import { TourEngine } from "./runtime/engine";
import { safeStore } from "./storage";
import { watchUrl } from "./url/watch";

export const VERSION = "0.3.0";

declare global {
  interface Window {
    ProductTourConfig?: { projectId?: string; apiBase?: string; debug?: boolean };
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
  if (params.has(PRODUCT.sdk.builderQueryParam) || params.has(PRODUCT.sdk.previewQueryParam)) {
    // Builder and preview modes arrive in Phase 4. Don't run visitor tours alongside them.
    log?.("builder/preview mode is not available in this version");
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
    navigate: (path) => location.assign(path),
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

try {
  boot();
} catch (err) {
  // Never break the host page.
  console.warn(`[${PRODUCT.name}] failed to start`, err);
}
