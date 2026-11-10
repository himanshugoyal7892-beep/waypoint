import { z } from "zod";
import { PLACEMENTS } from "../enums";
import { LIMITS } from "../limits";
import { validatePathname } from "../url";
import { multilineText, noControlChars, plainText, resourceId } from "./common";

export const pathnameSchema = z
  .string({ required_error: "Page path is required." })
  .transform((s) => s.trim())
  .superRefine((v, ctx) => {
    const err = validatePathname(v);
    if (err) ctx.addIssue({ code: z.ZodIssueCode.custom, message: err });
  });

const buttonLabel = (label: string) =>
  plainText(LIMITS.buttonLabel, label).pipe(z.string().min(1, `${label} is required.`));

const stepFields = {
  stepOrder: z
    .number({ invalid_type_error: "Step order must be a number." })
    .int("Step order must be a whole number.")
    .min(1, "Step order starts at 1.")
    .max(LIMITS.stepsPerTour, `A tour can have at most ${LIMITS.stepsPerTour} steps.`),
  pageUrl: pathnameSchema,
  cssSelector: noControlChars(LIMITS.cssSelector, "CSS selector"),
  title: plainText(LIMITS.stepTitle, "Title"),
  description: multilineText(LIMITS.stepDescription, "Description"),
  placement: z.enum(PLACEMENTS, { errorMap: () => ({ message: "Choose a placement." }) }),
  nextButtonLabel: buttonLabel("Next button label"),
  backButtonLabel: buttonLabel("Back button label"),
  allowSkip: z.boolean({ invalid_type_error: "Allow skip must be true or false." }),
};

const titleOrDescription = (v: { title?: string; description?: string }) =>
  Boolean(v.title?.trim()) || Boolean(v.description?.trim());

export const createStepSchema = z
  .object({
    ...stepFields,
    stepOrder: stepFields.stepOrder.optional(),
    title: stepFields.title.default(""),
    description: stepFields.description.default(""),
    placement: stepFields.placement.default("AUTO"),
    nextButtonLabel: stepFields.nextButtonLabel.default("Next"),
    backButtonLabel: stepFields.backButtonLabel.default("Back"),
    allowSkip: stepFields.allowSkip.default(true),
  })
  .refine(titleOrDescription, { message: "Add a title or a description.", path: ["title"] });
export type CreateStepInput = z.infer<typeof createStepSchema>;

/** Partial update. The title-or-description rule is re-checked by the service after merging. */
export const updateStepSchema = z
  .object(stepFields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Provide at least one field to update.");
export type UpdateStepInput = z.infer<typeof updateStepSchema>;

export const reorderStepsSchema = z.object({
  stepIds: z
    .array(resourceId)
    .min(1, "Provide the full list of step ids.")
    .max(LIMITS.stepsPerTour)
    .refine((ids) => new Set(ids).size === ids.length, "A step id is listed more than once."),
});
export type ReorderStepsInput = z.infer<typeof reorderStepsSchema>;

export { titleOrDescription };
