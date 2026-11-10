import { checkSequentialOrders } from "./ordering";
import { validatePathname, validatePathPattern } from "./url";

export interface PublishableStep {
  id: string;
  stepOrder: number;
  pageUrl: string;
  cssSelector: string;
  title: string;
  description: string;
}

export interface PublishableTour {
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  startUrl: string;
  steps: readonly PublishableStep[];
  project: { allowedOrigins: readonly string[] };
}

export type PublishIssueCode =
  | "TOUR_ARCHIVED"
  | "NO_STEPS"
  | "INVALID_START_URL"
  | "INVALID_PAGE_URL"
  | "MISSING_SELECTOR"
  | "MISSING_CONTENT"
  | "STEP_ORDER"
  | "NO_ALLOWED_ORIGIN";

export interface PublishIssue {
  code: PublishIssueCode;
  message: string;
  stepId?: string;
  stepOrder?: number;
  field?: string;
}

/**
 * Returns every reason the tour cannot be published (empty = publishable). Issues name the
 * step and field so the dashboard can link straight to what needs fixing.
 */
export function validatePublishable(tour: PublishableTour): PublishIssue[] {
  const issues: PublishIssue[] = [];

  if (tour.status === "ARCHIVED")
    issues.push({
      code: "TOUR_ARCHIVED",
      message: "Restore this tour from the archive before publishing it.",
    });

  if (tour.project.allowedOrigins.length === 0)
    issues.push({
      code: "NO_ALLOWED_ORIGIN",
      field: "allowedOrigins",
      message:
        "Add at least one allowed domain to the project (Project overview → Allowed origins).",
    });

  const startErr = validatePathPattern(tour.startUrl);
  if (startErr)
    issues.push({
      code: "INVALID_START_URL",
      field: "startUrl",
      message: `Start URL: ${startErr}`,
    });

  if (tour.steps.length === 0) {
    issues.push({ code: "NO_STEPS", message: "Add at least one step before publishing." });
    return issues;
  }

  const sorted = [...tour.steps].sort((a, b) => a.stepOrder - b.stepOrder);
  for (const step of sorted) {
    const label = `Step ${step.stepOrder}`;
    const pathErr = validatePathname(step.pageUrl);
    if (pathErr)
      issues.push({
        code: "INVALID_PAGE_URL",
        stepId: step.id,
        stepOrder: step.stepOrder,
        field: "pageUrl",
        message: `${label}: ${pathErr}`,
      });
    if (!step.cssSelector.trim())
      issues.push({
        code: "MISSING_SELECTOR",
        stepId: step.id,
        stepOrder: step.stepOrder,
        field: "cssSelector",
        message: `${label}: add a CSS selector for the element to highlight.`,
      });
    if (!step.title.trim() && !step.description.trim())
      issues.push({
        code: "MISSING_CONTENT",
        stepId: step.id,
        stepOrder: step.stepOrder,
        field: "title",
        message: `${label}: add a title or a description.`,
      });
  }

  for (const o of checkSequentialOrders(sorted.map((s) => s.stepOrder)))
    issues.push({ code: "STEP_ORDER", stepOrder: o.order, field: "stepOrder", message: o.message });

  return issues;
}
