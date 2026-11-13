import { z } from "zod";
import { IDENTITY_SOURCES } from "../enums";
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

const IDENTITY_KEY_PATTERNS = {
  // Dot path on window, e.g. userId or app.user.id. Read only; never executed.
  WINDOW: /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*){0,5}$/,
  DATALAYER: /^[\w.-]{1,100}$/,
  COOKIE: /^[\w.-]{1,100}$/,
} as const;

/** Where the SDK finds the logged-in user's id on the customer's site. */
export const identitySchema = z
  .object({
    identitySource: z.enum(IDENTITY_SOURCES),
    identityKey: z.union([z.string(), z.null()]).transform((v) => (v ?? "").trim() || null),
  })
  .superRefine((v, ctx) => {
    if (v.identitySource === "NONE") return;
    const pattern = IDENTITY_KEY_PATTERNS[v.identitySource];
    if (!v.identityKey || !pattern.test(v.identityKey))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["identityKey"],
        message:
          v.identitySource === "WINDOW"
            ? "Enter a variable name such as userId or app.user.id."
            : "Enter a field or cookie name (letters, numbers, _ . -).",
      });
  })
  .transform((v) => (v.identitySource === "NONE" ? { ...v, identityKey: null } : v));
export type IdentityInput = z.infer<typeof identitySchema>;

export const updateProjectSchema = createProjectSchema
  .partial()
  .extend({
    identitySource: z.enum(IDENTITY_SOURCES).optional(),
    identityKey: z.union([z.string(), z.null()]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Provide at least one field to update.")
  .superRefine((v, ctx) => {
    if (v.identitySource === undefined && v.identityKey === undefined) return;
    const r = identitySchema.safeParse({
      identitySource: v.identitySource ?? "NONE",
      identityKey: v.identityKey ?? null,
    });
    if (!r.success) for (const i of r.error.issues) ctx.addIssue(i);
  })
  .transform((v) => {
    if (v.identitySource === undefined && v.identityKey === undefined) return v;
    return {
      ...v,
      ...identitySchema.parse({
        identitySource: v.identitySource ?? "NONE",
        identityKey: v.identityKey ?? null,
      }),
    };
  });
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
