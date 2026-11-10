import { z } from "zod";
import { TOUR_STATUSES, TRIGGER_TYPES } from "../enums";
import { LIMITS } from "../limits";
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

export const createTourSchema = z.object({
  ...tourFields,
  triggerType: tourFields.triggerType.default("AUTO"),
});
export type CreateTourInput = z.infer<typeof createTourSchema>;

export const updateTourSchema = z
  .object(tourFields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Provide at least one field to update.");
export type UpdateTourInput = z.infer<typeof updateTourSchema>;

export const tourListQuerySchema = z.object({
  status: z.enum(TOUR_STATUSES).optional(),
});
