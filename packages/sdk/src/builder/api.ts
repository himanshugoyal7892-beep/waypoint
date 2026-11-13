import type { BuilderRedeemResponse, PublicTour } from "@waypoint/shared/api-types";
import type { Placement, TourStatus } from "@waypoint/shared/enums";
import type { PublishIssue } from "@waypoint/shared/publish-rules";

export interface BuilderTourSummary {
  id: string;
  name: string;
  status: TourStatus;
}

export interface BuilderStep {
  id: string;
  stepOrder: number;
  title: string;
  description: string;
  cssSelector: string;
  pageUrl: string;
  placement: Placement;
  nextButtonLabel: string;
  backButtonLabel: string;
  allowSkip: boolean;
}

export interface BuilderTour {
  id: string;
  name: string;
  status: TourStatus;
  startUrl: string;
  triggerType: "AUTO" | "MANUAL";
  version: number;
  steps: BuilderStep[];
}

export interface StepInput {
  stepOrder?: number;
  pageUrl: string;
  cssSelector: string;
  title: string;
  description: string;
  placement: Placement;
  nextButtonLabel: string;
  backButtonLabel: string;
  allowSkip: boolean;
}

export class BuilderApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: { path?: string; field?: string; message: string }[] = [],
  ) {
    super(message);
  }
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const d of this.details) {
      const k = d.path ?? d.field ?? "";
      if (k && !out[k]) out[k] = d.message;
    }
    return out;
  }
}

async function parse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => null)) as {
    error?: { code: string; message: string; details?: [] };
  } | null;
  if (!res.ok) {
    const e = data?.error;
    throw new BuilderApiError(
      res.status,
      e?.code ?? "UNKNOWN",
      e?.message ?? `Request failed (${res.status})`,
      e?.details ?? [],
    );
  }
  return data as T;
}

/** Redeems a single-use builder pass. text/plain avoids a CORS preflight. */
export async function redeemPass(apiBase: string, pass: string): Promise<BuilderRedeemResponse> {
  const res = await fetch(`${apiBase}/api/builder/v1/session`, {
    method: "POST",
    mode: "cors",
    credentials: "omit",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify({ pass }),
  });
  return parse<BuilderRedeemResponse>(res);
}

/** Authenticated client for the builder API. */
export class BuilderClient {
  constructor(
    private readonly apiBase: string,
    private readonly token: string,
  ) {}

  private async call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.apiBase}/api/builder/v1${path}`, {
      method,
      mode: "cors",
      credentials: "omit",
      headers: {
        Authorization: `Bearer ${this.token}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return parse<T>(res);
  }

  session() {
    return this.call<{
      project: { id: string; name: string; publicKey: string };
      tours: BuilderTourSummary[];
      mode: "BUILD" | "PREVIEW";
      tourId: string | null;
      expiresAt: string;
    }>("GET", "/session");
  }
  getTour(id: string) {
    return this.call<{ tour: BuilderTour; publishIssues: PublishIssue[] }>(
      "GET",
      `/tours/${encodeURIComponent(id)}`,
    );
  }
  createTour(input: { name: string; startUrl: string; triggerType: "AUTO" | "MANUAL" }) {
    return this.call<{ tour: BuilderTour }>("POST", "/tours", input);
  }
  createStep(tourId: string, input: StepInput) {
    return this.call<{ step: BuilderStep }>(
      "POST",
      `/tours/${encodeURIComponent(tourId)}/steps`,
      input,
    );
  }
  updateStep(stepId: string, input: Partial<StepInput>) {
    return this.call<{ step: BuilderStep }>("PATCH", `/steps/${encodeURIComponent(stepId)}`, input);
  }
  deleteStep(stepId: string) {
    return this.call<void>("DELETE", `/steps/${encodeURIComponent(stepId)}`);
  }
  reorder(tourId: string, stepIds: string[]) {
    return this.call<{ steps: BuilderStep[] }>(
      "PUT",
      `/tours/${encodeURIComponent(tourId)}/steps/order`,
      { stepIds },
    );
  }
  setPublished(tourId: string, publish: boolean) {
    return this.call<{ tour: BuilderTour }>(
      "POST",
      `/tours/${encodeURIComponent(tourId)}/${publish ? "publish" : "unpublish"}`,
    );
  }
}

/** Converts a draft tour into the shape the runtime engine plays (for preview). */
export function toPublicTour(t: BuilderTour): PublicTour {
  return {
    id: t.id,
    version: t.version,
    name: t.name,
    triggerType: "MANUAL",
    frequency: "ONCE",
    startUrl: t.startUrl,
    steps: t.steps.map((s) => ({
      id: s.id,
      stepOrder: s.stepOrder,
      title: s.title,
      description: s.description,
      cssSelector: s.cssSelector,
      pageUrl: s.pageUrl,
      placement: s.placement,
      nextButtonLabel: s.nextButtonLabel,
      backButtonLabel: s.backButtonLabel,
      allowSkip: s.allowSkip,
    })),
  };
}
