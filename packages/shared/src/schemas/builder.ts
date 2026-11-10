import { z } from "zod";
import { BUILDER_MODES } from "../enums";
import { LIMITS } from "../limits";
import { resourceId } from "./common";

export const createBuilderPassSchema = z
  .object({
    mode: z.enum(BUILDER_MODES).default("BUILD"),
    tourId: resourceId.optional(),
    targetUrl: z
      .string({ required_error: "Enter the page on your site where the builder should open." })
      .trim()
      .max(LIMITS.url)
      .url("Enter a full URL, e.g. http://localhost:5173/"),
  })
  .refine((v) => v.mode !== "PREVIEW" || Boolean(v.tourId), {
    message: "Preview needs a tour.",
    path: ["tourId"],
  });
export type CreateBuilderPassInput = z.infer<typeof createBuilderPassSchema>;

/** Body of POST /api/builder/v1/session (redeem). */
export const redeemBuilderPassSchema = z.object({
  pass: z.string().regex(/^wpb_[A-Za-z0-9_-]{43}$/, "Invalid builder pass."),
});
