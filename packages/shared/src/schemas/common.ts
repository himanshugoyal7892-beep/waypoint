import { z } from "zod";
import { RESOURCE_ID_PATTERN } from "../limits";
import { hasControlChars, normalizePlainText } from "../text";

export const resourceId = z.string().regex(RESOURCE_ID_PATTERN, "Invalid id.");

/** Single-line plain text: trimmed, control chars removed, length-checked after normalising. */
export const plainText = (max: number, label: string) =>
  z
    .string({ invalid_type_error: `${label} must be text.` })
    .transform((s) => normalizePlainText(s))
    .pipe(z.string().max(max, `${label} must be at most ${max} characters.`));

export const requiredPlainText = (max: number, label: string) =>
  z
    .string({
      required_error: `${label} is required.`,
      invalid_type_error: `${label} must be text.`,
    })
    .transform((s) => normalizePlainText(s))
    .pipe(
      z
        .string()
        .min(1, `${label} is required.`)
        .max(max, `${label} must be at most ${max} characters.`),
    );

export const multilineText = (max: number, label: string) =>
  z
    .string({ invalid_type_error: `${label} must be text.` })
    .transform((s) => normalizePlainText(s, { multiline: true }))
    .pipe(z.string().max(max, `${label} must be at most ${max} characters.`));

/** Raw string with no control characters (used for selectors, which must not be rewritten). */
export const noControlChars = (max: number, label: string) =>
  z
    .string({
      required_error: `${label} is required.`,
      invalid_type_error: `${label} must be text.`,
    })
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .min(1, `${label} is required.`)
        .max(max, `${label} must be at most ${max} characters.`)
        .refine(
          (s) => !hasControlChars(s) && !/[\n\r\t]/.test(s),
          `${label} must be a single line without control characters.`,
        ),
    );
