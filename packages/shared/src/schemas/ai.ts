import { z } from "zod";

/** Wording help actions offered next to a step's title and description. */
export const AI_WORDING_ACTIONS = [
  "SHORTEN",
  "CLEARER",
  "FRIENDLIER",
  "ARABIC",
  "ENGLISH",
] as const;
export type AiWordingAction = (typeof AI_WORDING_ACTIONS)[number];

export const aiWordingSchema = z
  .object({
    action: z.enum(AI_WORDING_ACTIONS),
    title: z.string().trim().max(120).default(""),
    description: z.string().trim().max(1000).default(""),
    /** Optional context that helps the wording fit, e.g. the tour name and page. */
    tourName: z.string().trim().max(120).optional(),
    pageUrl: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.title || v.description, {
    message: "Write a title or description first.",
    path: ["title"],
  });
export type AiWordingInput = z.infer<typeof aiWordingSchema>;

export interface AiWordingResult {
  title: string;
  description: string;
}

/** One element on the page, as collected by the builder's page scan. */
export const scannedElementSchema = z.object({
  selector: z.string().trim().min(1).max(300),
  tag: z.string().trim().max(20),
  /** Visible text, trimmed. */
  text: z.string().trim().max(160).default(""),
  /** aria-label, placeholder, alt or title. */
  label: z.string().trim().max(160).default(""),
  role: z.string().trim().max(40).default(""),
  /** Rough position on the page, 0–100 % of page height, for a sensible order. */
  y: z.number().min(0).max(100).default(0),
});
export type ScannedElement = z.infer<typeof scannedElementSchema>;

export const aiDraftSchema = z.object({
  tourId: z.string().min(1).max(40),
  pageUrl: z.string().trim().min(1).max(500),
  pageTitle: z.string().trim().max(200).default(""),
  /** What the tour should achieve, in the user's words. */
  goal: z.string().trim().max(300).default(""),
  stepCount: z.number().int().min(3).max(10).default(6),
  elements: z.array(scannedElementSchema).min(3).max(120),
});
export type AiDraftInput = z.infer<typeof aiDraftSchema>;

export interface AiDraftStep {
  cssSelector: string;
  title: string;
  description: string;
  placement: "AUTO" | "TOP" | "BOTTOM" | "LEFT" | "RIGHT";
}
export interface AiDraftResult {
  name: string;
  steps: AiDraftStep[];
}

export interface AiReviewSuggestion {
  stepId: string;
  stepOrder: number;
  why: string;
  title: string;
  description: string;
}
export interface AiReviewResult {
  /** One or two sentences on what is going wrong and why. */
  summary: string;
  /** Whether the review was based on real drop-off data or on the copy alone. */
  basedOn: "dropoff" | "copy";
  suggestions: AiReviewSuggestion[];
}
