/**
 * Central product configuration. "Waypoint" is a placeholder brand: change it here and
 * every dashboard label, page title and generated snippet comment follows.
 *
 * The SDK globals are fixed by the install-snippet contract, so they are kept here
 * for reference and are not meant to follow brand renames.
 */
export const PRODUCT = {
  name: "Waypoint",
  tagline: "Guided product tours without code changes",
  sdk: {
    configGlobal: "ProductTourConfig",
    apiGlobal: "ProductTour",
    fileName: "product-tour.js",
    builderQueryParam: "tour_builder",
    previewQueryParam: "tour_preview",
    builderPassHashParam: "ptb_token",
  },
  supportEmail: "support@example.com",
} as const;

export type ProductConfig = typeof PRODUCT;
