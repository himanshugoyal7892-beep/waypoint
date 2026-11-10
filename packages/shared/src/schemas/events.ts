import { z } from "zod";
import { EVENT_NAMES, STEP_SCOPED_EVENTS } from "../enums";
import { LIMITS, OPAQUE_ID_PATTERN, PUBLIC_KEY_PATTERN } from "../limits";
import { sanitizeTrackedUrl } from "../url";
import { resourceId } from "./common";

export const publicKeySchema = z.string().regex(PUBLIC_KEY_PATTERN, "Invalid project key.");

const opaqueId = (label: string) => z.string().regex(OPAQUE_ID_PATTERN, `Invalid ${label}.`);

export const analyticsEventSchema = z
  .object({
    clientEventId: opaqueId("clientEventId"),
    tourId: resourceId,
    tourVersion: z.number().int().min(1).max(1_000_000),
    stepId: resourceId.optional(),
    stepOrder: z.number().int().min(1).max(LIMITS.stepsPerTour).optional(),
    anonymousVisitorId: opaqueId("anonymousVisitorId"),
    sessionId: opaqueId("sessionId"),
    eventName: z.enum(EVENT_NAMES),
    // Sanitised to origin + pathname; anything else is rejected.
    currentUrl: z
      .string()
      .max(LIMITS.url)
      .transform((v, ctx) => {
        const clean = sanitizeTrackedUrl(v);
        if (!clean) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "currentUrl must be an absolute http(s) URL.",
          });
          return z.NEVER;
        }
        return clean;
      }),
    /** Client epoch milliseconds. */
    timestamp: z.number().int().positive(),
    errorCode: z
      .string()
      .regex(/^[a-z0-9_]{1,64}$/)
      .optional(),
  })
  .strict()
  .superRefine((e, ctx) => {
    if (STEP_SCOPED_EVENTS.has(e.eventName) && (!e.stepId || e.stepOrder === undefined))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["stepId"],
        message: `${e.eventName} requires stepId and stepOrder.`,
      });
    if (e.errorCode && e.eventName !== "element_not_found" && e.eventName !== "tour_error")
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["errorCode"],
        message: "errorCode is only allowed on error events.",
      });
  });
export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>;

export const analyticsBatchSchema = z
  .object({
    projectKey: publicKeySchema,
    events: z.array(analyticsEventSchema).min(1).max(LIMITS.eventsPerBatch),
  })
  .strict();
export type AnalyticsBatchInput = z.infer<typeof analyticsBatchSchema>;

export const publicToursQuerySchema = z.object({
  path: z
    .string({ required_error: "path is required." })
    .max(LIMITS.url)
    .refine(
      (p) => p.startsWith("/") && !p.includes("?") && !p.includes("#"),
      "path must be a pathname.",
    ),
});
