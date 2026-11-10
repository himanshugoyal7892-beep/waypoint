import { z } from "zod";
import { LIMITS } from "../limits";
import { explainInvalidOrigin, normalizeOrigin } from "../origins";
import { requiredPlainText } from "./common";

const HOSTNAME =
  /^(localhost|(\d{1,3}\.){3}\d{1,3}|([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63})(:\d{1,5})?$/;

export const domainSchema = z
  .string({ required_error: "Domain is required." })
  .transform((s) =>
    s
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, ""),
  )
  .pipe(
    z
      .string()
      .min(1, "Domain is required.")
      .max(LIMITS.domain, `Domain must be at most ${LIMITS.domain} characters.`)
      .regex(HOSTNAME, "Enter a domain such as shop.example.com or localhost:5173."),
  );

export const originSchema = z
  .string()
  .superRefine((value, ctx) => {
    if (!normalizeOrigin(value))
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: explainInvalidOrigin(value) });
  })
  .transform((v) => normalizeOrigin(v) as string);

export const allowedOriginsSchema = z
  .array(originSchema, { invalid_type_error: "Allowed origins must be a list." })
  .max(LIMITS.allowedOriginsMax, `At most ${LIMITS.allowedOriginsMax} allowed origins.`)
  .transform((list) => [...new Set(list)]);

export const createProjectSchema = z.object({
  name: requiredPlainText(LIMITS.projectName, "Project name"),
  domain: domainSchema,
  // May be empty on create; publishing requires at least one (publish-rules).
  allowedOrigins: allowedOriginsSchema.default([]),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Provide at least one field to update.");
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
