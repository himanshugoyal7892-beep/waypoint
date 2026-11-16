"use client";

import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useToast } from "@/components/toast";
import { ConfirmAction } from "@/components/confirm-action";
import { Button } from "@/components/ui/button";
import { Alert, Badge } from "@/components/ui/misc";
import { ApiClientError, apiFetch } from "@/lib/api-client";

export interface StepRow {
  id: string;
  stepOrder: number;
  title: string;
  description: string;
  cssSelector: string;
  pageUrl: string;
  placement: string;
  allowSkip: boolean;
}

export function StepList({
  tourId,
  steps,
  baseHref,
}: {
  tourId: string;
  steps: StepRow[];
  baseHref: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [order, setOrder] = React.useState(steps);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [announcement, setAnnouncement] = React.useState("");

  React.useEffect(() => setOrder(steps), [steps]);

  async function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target]!, next[index]!];
    const previous = order;
    setOrder(next); // optimistic
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/v1/tours/${tourId}/steps/order`, {
        method: "PUT",
        body: { stepIds: next.map((s) => s.id) },
      });
      setAnnouncement(`Moved “${label(order[index]!)}” to position ${target + 1}.`);
      router.refresh();
    } catch (err) {
      setOrder(previous);
      setError(err instanceof ApiClientError ? err.message : "Couldn't reorder steps.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await apiFetch(`/api/admin/v1/steps/${id}`, { method: "DELETE" });
    toast.success("Step deleted");
    router.refresh();
  }

  const label = (s: StepRow) => s.title || s.description.slice(0, 40) || `Step ${s.stepOrder}`;

  return (
    <div className="space-y-3">
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {error && <Alert tone="error">{error}</Alert>}
      <ol
        className="divide-y divide-border rounded-lg border border-border"
        aria-label="Tour steps"
      >
        {order.map((s, i) => (
          <li
            key={s.id}
            className="group flex flex-wrap items-center gap-3 p-3 transition-colors hover:bg-muted/40 sm:flex-nowrap"
          >
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft font-display text-sm font-semibold text-primary ring-1 ring-primary/15"
              aria-hidden
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <Link
                href={`${baseHref}/steps/${s.id}`}
                className="block truncate text-sm font-medium hover:text-primary"
              >
                <span className="sr-only">Step {i + 1}: </span>
                {label(s)}
              </Link>
              {s.title && s.description && (
                <p className="truncate text-xs text-muted-foreground">{s.description}</p>
              )}
              <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono">{s.pageUrl}</span>
                <span
                  className="max-w-[26ch] truncate rounded-md bg-muted px-1.5 py-0.5 font-mono"
                  title={s.cssSelector}
                >
                  {s.cssSelector}
                </span>
                <Badge variant="muted" className="capitalize">
                  {s.placement === "AUTO" ? "auto place" : s.placement.toLowerCase()}
                </Badge>
                {!s.allowSkip && <Badge variant="warning">no skip</Badge>}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-0.5 opacity-70 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => move(i, -1)}
                disabled={busy || i === 0}
                aria-label={`Move step ${i + 1} up`}
              >
                <ArrowUp aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => move(i, 1)}
                disabled={busy || i === order.length - 1}
                aria-label={`Move step ${i + 1} down`}
              >
                <ArrowDown aria-hidden />
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link href={`${baseHref}/steps/${s.id}`} aria-label={`Edit step ${i + 1}`}>
                  <Pencil aria-hidden />
                </Link>
              </Button>
              <ConfirmAction
                title={`Delete step ${i + 1}?`}
                description={
                  <p>
                    “{label(s)}” will be removed and the remaining steps renumbered. This can&apos;t
                    be undone.
                  </p>
                }
                confirmLabel="Delete step"
                onConfirm={() => remove(s.id)}
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete step ${i + 1}`}
                    disabled={busy}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                }
              />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
