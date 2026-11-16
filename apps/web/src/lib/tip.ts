import type { PublicTipTheme } from "@waypoint/shared/api-types";

/** The visitor tip settings of a project, in the shape the preview components take. */
export function tipOf(p: {
  tipStyle: PublicTipTheme["style"];
  tipCorners: PublicTipTheme["corners"];
  tipProgress: PublicTipTheme["progress"];
  tipFont: PublicTipTheme["font"];
  tipBackdrop: boolean;
}): PublicTipTheme {
  return {
    style: p.tipStyle,
    corners: p.tipCorners,
    progress: p.tipProgress,
    font: p.tipFont,
    backdrop: p.tipBackdrop,
  };
}

/** A real website origin for links and previews, preferring it over local development ones. */
export function siteOrigin(origins: string[]) {
  return (
    origins.find((o) => !/^http:\/\/(localhost|127\.0\.0\.1)/.test(o)) ??
    origins[0] ??
    "http://localhost:5173"
  );
}
