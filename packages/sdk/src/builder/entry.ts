import { PRODUCT } from "@waypoint/shared/product-config";
import { safeStore } from "../storage";
import { BuilderApp } from "./app";

declare global {
  interface Window {
    __ptourBuilderInit?: { apiBase: string; projectKey: string; tourId?: string | null };
    __ptourBuilderActive?: boolean;
  }
}

// Loaded on demand by product-tour.js when builder mode is requested.
try {
  const init = window.__ptourBuilderInit;
  if (init && !window.__ptourBuilderActive) {
    window.__ptourBuilderActive = true;
    void new BuilderApp(init.apiBase, safeStore("session"), init.tourId ?? null).start();
  }
} catch (err) {
  window.__ptourBuilderActive = false;
  console.warn(`[${PRODUCT.name}] builder failed to start`, err);
}
