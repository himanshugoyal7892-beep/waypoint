import type { PublicTipTheme } from "./api-types";

export const DEFAULT_TIP: PublicTipTheme = {
  style: "LIGHT",
  corners: "ROUNDED",
  progress: "COUNTER",
  font: "SYSTEM",
  backdrop: true,
};

const DEFAULT_PRIMARY = "#3b4fd8";

/** WCAG relative luminance of "#RRGGBB". */
export function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

/** Black or white text, whichever reads better on `hex`. */
export function readableOn(hex: string): string {
  return luminance(hex) > 0.4 ? "#0f172a" : "#ffffff";
}

/**
 * CSS custom properties for the tooltip. Pure, so the dashboard preview and tests can use it.
 * `siteFont` is the customer page's body font, used when font = SITE.
 */
export function tipThemeVars(
  tip: PublicTipTheme,
  brand: string | null,
  siteFont?: string,
): Record<string, string> {
  const primary = brand ?? DEFAULT_PRIMARY;
  const radius = {
    ROUNDED: ["14px", "8px", "10px"],
    SOFT: ["6px", "4px", "4px"],
    SQUARE: ["0px", "0px", "0px"],
  }[tip.corners];
  const base: Record<string, string> = {
    "--wp-radius": radius[0]!,
    "--wp-btn-radius": radius[1]!,
    "--wp-hl-radius": radius[2]!,
    "--wp-backdrop": tip.backdrop ? "rgba(15,23,42,.55)" : "transparent",
    "--wp-font":
      tip.font === "SITE" && siteFont
        ? siteFont
        : 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    "--wp-primary": primary,
    "--wp-on-primary": readableOn(primary),
  };
  if (tip.style === "DARK")
    return {
      ...base,
      // A brand colour that's too dark to see on navy falls back to a light indigo.
      "--wp-primary": luminance(primary) < 0.12 ? "#8a85ff" : primary,
      "--wp-on-primary": readableOn(luminance(primary) < 0.12 ? "#8a85ff" : primary),
      "--wp-bg": "#161a33",
      "--wp-fg": "#f1f2fb",
      "--wp-body": "#c9cce6",
      "--wp-muted": "#9ea3cc",
      "--wp-border": "#2e3463",
      "--wp-hover": "#22264a",
      "--wp-btn-bg": "#1d2142",
      "--wp-track": "#2e3463",
    };
  if (tip.style === "BRAND") {
    const fg = readableOn(primary);
    const light = fg === "#ffffff";
    return {
      ...base,
      "--wp-bg": primary,
      "--wp-fg": fg,
      "--wp-body": light ? "rgba(255,255,255,.88)" : "rgba(15,23,42,.8)",
      "--wp-muted": light ? "rgba(255,255,255,.72)" : "rgba(15,23,42,.6)",
      "--wp-border": light ? "rgba(255,255,255,.35)" : "rgba(15,23,42,.25)",
      "--wp-hover": light ? "rgba(255,255,255,.14)" : "rgba(15,23,42,.08)",
      "--wp-btn-bg": "transparent",
      "--wp-track": light ? "rgba(255,255,255,.3)" : "rgba(15,23,42,.2)",
      // Primary button flips to the tip's text colour with brand-coloured text.
      "--wp-primary-btn": fg,
      "--wp-on-primary": primary,
      "--wp-ring": fg,
    };
  }
  return {
    ...base,
    "--wp-bg": "#ffffff",
    "--wp-fg": "#0f172a",
    "--wp-body": "#334155",
    "--wp-muted": "#64748b",
    "--wp-border": "#e2e8f0",
    "--wp-hover": "#f1f5f9",
    "--wp-btn-bg": "#ffffff",
    "--wp-track": "#e2e8f0",
  };
}
