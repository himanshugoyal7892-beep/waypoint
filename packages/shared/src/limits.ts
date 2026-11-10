export const LIMITS = {
  projectName: 100,
  domain: 253,
  allowedOriginsMax: 20,
  tourName: 120,
  tourDescription: 500,
  url: 2048,
  stepTitle: 120,
  stepDescription: 1000,
  cssSelector: 1000,
  buttonLabel: 30,
  stepsPerTour: 100,
  eventsPerBatch: 20,
  publicBodyBytes: 32 * 1024,
  adminBodyBytes: 64 * 1024,
  idMax: 64,
  /** Client timestamps outside this window are replaced by the server receive time. */
  eventClockSkewMs: 24 * 60 * 60 * 1000,
} as const;

/** `pk_` + 24 base62 characters. */
export const PUBLIC_KEY_PATTERN = /^pk_[A-Za-z0-9]{24}$/;

/** Opaque client-generated ids (visitor, session, event): URL-safe, 8–64 chars. */
export const OPAQUE_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

/** Database ids (cuid) plus seed ids: conservative charset. */
export const RESOURCE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
