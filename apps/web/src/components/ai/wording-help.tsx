"use client";

import type { AiWordingAction, AiWordingResult } from "@waypoint/shared";
import { Check, Languages, Loader2, Minimize2, Smile, Sparkles, X, Lightbulb } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { ApiClientError, apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const ACTIONS: { action: AiWordingAction; label: string; Icon: typeof Sparkles }[] = [
  { action: "SHORTEN", label: "Shorten", Icon: Minimize2 },
  { action: "CLEARER", label: "Clearer", Icon: Lightbulb },
  { action: "FRIENDLIER", label: "Friendlier", Icon: Smile },
  { action: "ARABIC", label: "Arabic", Icon: Languages },
  { action: "ENGLISH", label: "English", Icon: Languages },
];

/**
 * One-click AI rewrites of a step's title and description. The suggestion is shown first and
 * only replaces the text when the user picks "Use this".
 */
export function WordingHelp({
  title,
  description,
  pageUrl,
  onApply,
}: {
  title: string;
  description: string;
  pageUrl?: string;
  onApply: (r: AiWordingResult) => void;
}) {
  const [busy, setBusy] = React.useState<AiWordingAction | null>(null);
  const [result, setResult] = React.useState<AiWordingResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const empty = !title.trim() && !description.trim();

  async function run(action: AiWordingAction) {
    setBusy(action);
    setError(null);
    setResult(null);
    try {
      const { result } = await apiFetch<{ result: AiWordingResult }>("/api/admin/v1/ai/wording", {
        method: "POST",
        body: { action, title, description, pageUrl },
      });
      setResult(result);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't reach the AI. Try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-primary-soft/50 p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
          <Sparkles className="size-3.5" aria-hidden /> AI help
        </span>
        {ACTIONS.map(({ action, label, Icon }) => (
          <button
            key={action}
            type="button"
            onClick={() => run(action)}
            disabled={busy !== null || empty}
            title={empty ? "Write a title or description first" : undefined}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === action ? (
              <Loader2 className="size-3 animate-spin" aria-hidden />
            ) : (
              <Icon className="size-3" aria-hidden />
            )}
            {label === "Arabic" ? "Arabic (عربي)" : label}
          </button>
        ))}
      </div>

      <div aria-live="polite">
        {busy && <p className="mt-2 text-xs text-muted-foreground">Writing a suggestion…</p>}
        {error && (
          <p role="alert" className="mt-2 text-xs text-destructive">
            {error}
          </p>
        )}
        {result && (
          <div className="mt-3 rounded-md border border-border bg-card p-3 shadow-xs motion-safe:animate-[wp-pop_.15s_ease-out]">
            <p className="text-xs font-medium text-muted-foreground">Suggestion</p>
            {result.title && (
              <p dir="auto" className="mt-1 text-sm font-semibold">
                {result.title}
              </p>
            )}
            {result.description && (
              <p
                dir="auto"
                className={cn("text-sm text-muted-foreground", !result.title && "mt-1")}
              >
                {result.description}
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onApply(result);
                  setResult(null);
                }}
              >
                <Check aria-hidden /> Use this
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setResult(null)}>
                <X aria-hidden /> Discard
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
