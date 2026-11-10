"use client";

import { PLACEMENTS, createStepSchema, updateStepSchema, type Placement } from "@waypoint/shared";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import type { ZodTypeAny } from "zod";
import { Field, FormError, controlProps } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";
import { pickError, useFormSubmit } from "./use-form-submit";

export interface StepValues {
  stepOrder: number;
  pageUrl: string;
  cssSelector: string;
  title: string;
  description: string;
  placement: Placement;
  nextButtonLabel: string;
  backButtonLabel: string;
  allowSkip: boolean;
}

const PLACEMENT_LABELS: Record<Placement, string> = {
  AUTO: "Auto (best fit)",
  TOP: "Top",
  BOTTOM: "Bottom",
  LEFT: "Left",
  RIGHT: "Right",
};

export function StepForm({
  mode,
  tourId,
  stepId,
  backHref,
  maxOrder,
  initial,
}: {
  mode: "create" | "edit";
  tourId: string;
  stepId?: string;
  backHref: string;
  /** Highest valid position (step count, +1 when creating). */
  maxOrder: number;
  initial: StepValues;
}) {
  const router = useRouter();
  const [values, setValues] = React.useState<StepValues>(initial);
  const schema: ZodTypeAny = mode === "create" ? createStepSchema : updateStepSchema;
  const { errors, formError, submitting, submit } = useFormSubmit(schema, async (data) => {
    if (mode === "create")
      await apiFetch(`/api/admin/v1/tours/${tourId}/steps`, { method: "POST", body: data });
    else await apiFetch(`/api/admin/v1/steps/${stepId}`, { method: "PATCH", body: data });
    router.push(backHref);
    router.refresh();
  });

  const set =
    <K extends keyof StepValues>(
      k: K,
      transform: (raw: string) => StepValues[K] = (r) => r as StepValues[K],
    ) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValues((v) => ({ ...v, [k]: transform(e.target.value) }));
  const err = (k: string) => pickError(errors, k);

  return (
    <form
      noValidate
      className="space-y-6"
      aria-label={mode === "create" ? "Add step" : "Edit step"}
      onSubmit={(e) => {
        e.preventDefault();
        void submit(values);
      }}
    >
      <FormError message={formError} />

      <fieldset className="space-y-5">
        <legend className="mb-3 text-sm font-semibold">Target element</legend>
        <div className="grid gap-5 sm:grid-cols-[8rem_1fr]">
          <Field
            id="step-order"
            label="Step order"
            required
            error={err("stepOrder")}
            hint={`1 – ${maxOrder}`}
          >
            <Input
              {...controlProps("step-order", err("stepOrder"), "hint")}
              type="number"
              inputMode="numeric"
              min={1}
              max={maxOrder}
              value={Number.isNaN(values.stepOrder) ? "" : values.stepOrder}
              onChange={set("stepOrder", (r) => (r === "" ? Number.NaN : Number(r)))}
              required
            />
          </Field>
          <Field
            id="step-pageUrl"
            label="Page path"
            required
            error={err("pageUrl")}
            hint={
              <>
                The page this step appears on, without domain or query string, e.g.{" "}
                <code>/products/aurora-headphones</code>.
              </>
            }
          >
            <Input
              {...controlProps("step-pageUrl", err("pageUrl"), "hint")}
              value={values.pageUrl}
              onChange={set("pageUrl")}
              className="font-mono"
              spellCheck={false}
              required
            />
          </Field>
        </div>
        <Field
          id="step-cssSelector"
          label="CSS selector"
          required
          error={err("cssSelector")}
          hint={
            <>
              Prefer a stable attribute you add to your markup, e.g.{" "}
              <code>[data-tour-id=&quot;add-to-cart&quot;]</code>. Avoid auto-generated class names.
              The visual element picker arrives in a later phase.
            </>
          }
        >
          <Input
            {...controlProps("step-cssSelector", err("cssSelector"), "hint")}
            value={values.cssSelector}
            onChange={set("cssSelector")}
            className="font-mono"
            spellCheck={false}
            maxLength={1000}
            required
          />
        </Field>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="mb-3 text-sm font-semibold">Tooltip content</legend>
        <p className="-mt-2 text-xs text-muted-foreground">
          Plain text only. A title or a description is required.
        </p>
        <Field id="step-title" label="Title" error={err("title")}>
          <Input
            {...controlProps("step-title", err("title"))}
            value={values.title}
            onChange={set("title")}
            maxLength={120}
          />
        </Field>
        <Field id="step-description" label="Description" error={err("description")}>
          <Textarea
            {...controlProps("step-description", err("description"))}
            value={values.description}
            onChange={set("description")}
            maxLength={1000}
            rows={4}
          />
        </Field>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="mb-3 text-sm font-semibold">Behaviour</legend>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field id="step-placement" label="Placement" error={err("placement")}>
            <NativeSelect
              {...controlProps("step-placement", err("placement"))}
              value={values.placement}
              onChange={set("placement", (r) => r as Placement)}
            >
              {PLACEMENTS.map((p) => (
                <option key={p} value={p}>
                  {PLACEMENT_LABELS[p]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id="step-next" label="Next button label" required error={err("nextButtonLabel")}>
            <Input
              {...controlProps("step-next", err("nextButtonLabel"))}
              value={values.nextButtonLabel}
              onChange={set("nextButtonLabel")}
              maxLength={30}
              required
            />
          </Field>
          <Field id="step-back" label="Back button label" required error={err("backButtonLabel")}>
            <Input
              {...controlProps("step-back", err("backButtonLabel"))}
              value={values.backButtonLabel}
              onChange={set("backButtonLabel")}
              maxLength={30}
              required
            />
          </Field>
        </div>
        <div className="flex items-start gap-2">
          <input
            id="step-allowSkip"
            type="checkbox"
            className="mt-0.5 size-4 rounded border-border accent-[var(--color-primary)]"
            checked={values.allowSkip}
            onChange={(e) => setValues((v) => ({ ...v, allowSkip: e.target.checked }))}
            aria-describedby="step-allowSkip-hint"
          />
          <div>
            <label htmlFor="step-allowSkip" className="text-sm font-medium">
              Allow skip
            </label>
            <p id="step-allowSkip-hint" className="text-xs text-muted-foreground">
              Shows a Skip button so visitors can leave the tour on this step.
            </p>
          </div>
        </div>
      </fieldset>

      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="animate-spin" aria-hidden />}
          {mode === "create"
            ? submitting
              ? "Adding…"
              : "Add step"
            : submitting
              ? "Saving…"
              : "Save step"}
        </Button>
        <Button variant="ghost" onClick={() => router.push(backHref)} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
