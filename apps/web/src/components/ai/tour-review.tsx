"use client";

import type { AiReviewResult, AiReviewSuggestion } from "@waypoint/shared";
import { ArrowRight, Check, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { DemoTag } from "./wording-help";
import { ApiClientError, apiFetch } from "@/lib/api-client";

interface StepText {
  id: string;
  stepOrder: number;
  title: string;
  description: string;
}

/**
 * Asks the AI why visitors leave this tour (or, without enough data, which copy is weakest) and
 * offers rewrites that can be applied to the step in one click.
 */
export function TourReview({
  tourId,
  steps,
  dropOffStep,
}: {
  tourId: string;
  steps: StepText[];
  /** The step most visitors leave on, when the data shows one. */
  dropOffStep: number | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);
  const [review, setReview] = React.useState<AiReviewResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [demo, setDemo] = React.useState(false);
  const [applied, setApplied] = React.useState<Set<string>>(new Set());
  const [applying, setApplying] = React.useState<string | null>(null);

  async function ask() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{ result: AiReviewResult; demo?: boolean }>(
        `/api/admin/v1/tours/${tourId}/ai-review`,
        { method: "POST" },
      );
      setDemo(Boolean(res.demo));
      setReview(res.result);
      setApplied(new Set());
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't reach the AI. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function apply(s: AiReviewSuggestion) {
    setApplying(s.stepId);
    try {
      await apiFetch(`/api/admin/v1/steps/${s.stepId}`, {
        method: "PATCH",
        body: { title: s.title, description: s.description },
      });
      setApplied((a) => new Set(a).add(s.stepId));
      toast.success(`Step ${s.stepOrder} updated`, "Published tours show the new text right away.");
      router.refresh();
    } catch (err) {
      toast.error(
        "Couldn't update the step",
        err instanceof ApiClientError ? err.message : undefined,
      );
    } finally {
      setApplying(null);
    }
  }

  const current = (id: string) => steps.find((s) => s.id === id);

  return (
    <div className="space-y-3">
      {!review && (
        <>
          <p className="text-sm text-muted-foreground">
            {dropOffStep
              ? `Most visitors leave on step ${dropOffStep}. Ask the AI why, and get a rewrite you can apply in one click.`
              : "Not enough visitors yet to see where they leave. The AI can still review the text and suggest the rewrites most likely to help."}
          </p>
          <Button onClick={ask} disabled={busy || steps.length === 0} className="w-full">
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
            {busy ? "Looking at your tour…" : dropOffStep ? "Explain drop-offs" : "Review the text"}
          </Button>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {review && (
        <div className="space-y-3" aria-live="polite">
          <p className="rounded-lg bg-primary-soft/60 p-3 text-sm">
            <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-primary">
              <Sparkles className="size-3.5" aria-hidden />
              {review.basedOn === "dropoff" ? "Why visitors leave" : "Text review"}
              {demo && <DemoTag />}
            </span>
            {review.summary}
          </p>
          {review.suggestions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No rewrites needed. The text reads well.
            </p>
          )}
          {review.suggestions.map((s) => {
            const now = current(s.stepId);
            const done = applied.has(s.stepId);
            return (
              <div key={s.stepId} className="rounded-lg border border-border p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Step {s.stepOrder} · {s.why}
                </p>
                <div className="mt-2 grid gap-2 text-sm">
                  {now && (
                    <div className="rounded-md bg-muted/60 p-2 text-muted-foreground line-through decoration-muted-foreground/40">
                      <p dir="auto" className="font-medium">
                        {now.title}
                      </p>
                      <p dir="auto" className="text-xs">
                        {now.description}
                      </p>
                    </div>
                  )}
                  <ArrowRight
                    className="mx-auto size-3.5 rotate-90 text-muted-foreground"
                    aria-hidden
                  />
                  <div className="rounded-md bg-success-soft/60 p-2">
                    <p dir="auto" className="font-medium">
                      {s.title}
                    </p>
                    <p dir="auto" className="text-xs text-muted-foreground">
                      {s.description}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={done ? "outline" : "default"}
                  className="mt-3"
                  disabled={done || applying !== null}
                  onClick={() => apply(s)}
                >
                  {applying === s.stepId ? (
                    <Loader2 className="animate-spin" aria-hidden />
                  ) : (
                    <Check aria-hidden />
                  )}
                  {done ? "Applied" : `Apply to step ${s.stepOrder}`}
                </Button>
              </div>
            );
          })}
          <Button variant="ghost" size="sm" onClick={ask} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : <RotateCcw aria-hidden />}
            Ask again
          </Button>
        </div>
      )}
    </div>
  );
}
