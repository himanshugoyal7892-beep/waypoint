import { z } from "zod";
import { AUDIENCES, FREQUENCIES, TOUR_STATUSES, TRIGGER_TYPES } from "../enums";
import { LIMITS } from "../limits";
import { TARGETING_LIMITS, targetingIssues, type TourRules } from "../targeting";
import { validatePathPattern } from "../url";
import { multilineText, requiredPlainText } from "./common";

export const pathPatternSchema = z
  .string({ required_error: "Start URL is required." })
  .transform((s) => s.trim())
  .superRefine((v, ctx) => {
    const err = validatePathPattern(v);
    if (err) ctx.addIssue({ code: z.ZodIssueCode.custom, message: err });
  });

const tourFields = {
  name: requiredPlainText(LIMITS.tourName, "Tour name"),
  description: multilineText(LIMITS.tourDescription, "Description")
    .nullable()
    .optional()
    .transform((v) => (v ? v : null)),
  startUrl: pathPatternSchema,
  triggerType: z.enum(TRIGGER_TYPES, {
    errorMap: () => ({ message: "Trigger must be AUTO or MANUAL." }),
  }),
};

/** "YYYY-MM-DD" (or empty) → UTC midnight Date, or null. */
export const dateOnlySchema = z.union([z.string(), z.null()]).transform((v, ctx) => {
  const s = (v ?? "").trim();
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const d = m ? new Date(Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!)) : null;
  if (!d || d.getUTCDate() !== +m![3]!) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid date." });
    return z.NEVER;
  }
  return d;
});

const wholeNumber = (label: string, max: number) =>
  z.union([z.number(), z.string(), z.null()]).transform((v, ctx) => {
    if (v === null || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isInteger(n) || n < 1 || n > max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${label} must be a whole number from 1 to ${max}.`,
      });
      return z.NEVER;
    }
    return n;
  });

/** Who sees an automatic tour and how often. Cross-field checks: targetingIssues(). */
export const targetingFields = {
  audience: z.enum(AUDIENCES, { errorMap: () => ({ message: "Choose who sees the tour." }) }),
  audienceDays: wholeNumber("Days", TARGETING_LIMITS.days),
  audienceBefore: dateOnlySchema,
  frequency: z.enum(FREQUENCIES, { errorMap: () => ({ message: "Choose how often it shows." }) }),
  maxShows: wholeNumber("Times", TARGETING_LIMITS.maxShows),
  intervalDays: wholeNumber("Days", TARGETING_LIMITS.days),
  startsAt: dateOnlySchema,
  endsAt: dateOnlySchema,
};

export const DEFAULT_TARGETING: TourRules = {
  audience: "ALL",
  audienceDays: null,
  audienceBefore: null,
  frequency: "ONCE",
  maxShows: null,
  intervalDays: null,
  startsAt: null,
  endsAt: null,
};

export const createTourSchema = z
  .object({
    ...tourFields,
    triggerType: tourFields.triggerType.default("AUTO"),
    audience: targetingFields.audience.default("ALL"),
    audienceDays: targetingFields.audienceDays.optional().transform((v) => v ?? null),
    audienceBefore: targetingFields.audienceBefore.optional().transform((v) => v ?? null),
    frequency: targetingFields.frequency.default("ONCE"),
    maxShows: targetingFields.maxShows.optional().transform((v) => v ?? null),
    intervalDays: targetingFields.intervalDays.optional().transform((v) => v ?? null),
    startsAt: targetingFields.startsAt.optional().transform((v) => v ?? null),
    endsAt: targetingFields.endsAt.optional().transform((v) => v ?? null),
  })
  .superRefine((v, ctx) => {
    for (const i of targetingIssues(v))
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [i.path], message: i.message });
  });
export type CreateTourInput = z.infer<typeof createTourSchema>;

export const updateTourSchema = z
  .object({ ...tourFields, ...targetingFields })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Provide at least one field to update.");
export type UpdateTourInput = z.infer<typeof updateTourSchema>;

export const tourListQuerySchema = z.object({
  status: z.enum(TOUR_STATUSES).optional(),
});
