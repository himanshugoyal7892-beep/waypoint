// String values intentionally match the Prisma enums so values pass through unchanged.

export const TOUR_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type TourStatus = (typeof TOUR_STATUSES)[number];

export const TRIGGER_TYPES = ["AUTO", "MANUAL"] as const;
export type TriggerType = (typeof TRIGGER_TYPES)[number];

export const PLACEMENTS = ["TOP", "BOTTOM", "LEFT", "RIGHT", "AUTO"] as const;
export type Placement = (typeof PLACEMENTS)[number];

export const BUILDER_MODES = ["BUILD", "PREVIEW"] as const;
export type BuilderMode = (typeof BUILDER_MODES)[number];

export const EVENT_NAMES = [
  "tour_started",
  "step_viewed",
  "next_clicked",
  "back_clicked",
  "tour_skipped",
  "tour_completed",
  "element_not_found",
  "tour_error",
] as const;
export type EventName = (typeof EVENT_NAMES)[number];

/** Events that are about a specific step and therefore must carry stepId + stepOrder. */
export const STEP_SCOPED_EVENTS: ReadonlySet<EventName> = new Set<EventName>([
  "step_viewed",
  "next_clicked",
  "back_clicked",
  "element_not_found",
]);

export const AUDIENCES = ["ALL", "NEW_USERS", "DORMANT_USERS", "EXISTING_USERS"] as const;
export type Audience = (typeof AUDIENCES)[number];

export const FREQUENCIES = ["ONCE", "UNTIL_COMPLETED", "INTERVAL"] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export const IDENTITY_SOURCES = ["NONE", "WINDOW", "DATALAYER", "COOKIE"] as const;
export type IdentitySource = (typeof IDENTITY_SOURCES)[number];
