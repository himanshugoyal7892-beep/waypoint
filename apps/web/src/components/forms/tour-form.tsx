"use client";

import { createTourSchema, updateTourSchema } from "@waypoint/shared";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import type { ZodTypeAny } from "zod";
import { Field, FormError, controlProps } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { apiFetch } from "@/lib/api-client";
import { pickError, useFormSubmit } from "./use-form-submit";

interface Values {
  name: string;
  description: string;
  startUrl: string;
  triggerType: "AUTO" | "MANUAL";
}

export function TourForm({
  mode,
  projectId,
  tourId,
  initial = { name: "", description: "", startUrl: "/", triggerType: "AUTO" },
}: {
  mode: "create" | "edit";
  projectId: string;
  tourId?: string;
  initial?: Values;
}) {
  const router = useRouter();
  const [values, setValues] = React.useState<Values>(initial);
  const [saved, setSaved] = React.useState(false);
  const schema: ZodTypeAny = mode === "create" ? createTourSchema : updateTourSchema;
  const { errors, formError, submitting, submit } = useFormSubmit(schema, async (data) => {
    if (mode === "create") {
      const { tour } = await apiFetch<{ tour: { id: string } }>(
        `/api/admin/v1/projects/${projectId}/tours`,
        { method: "POST", body: data },
      );
      router.push(`/dashboard/projects/${projectId}/tours/${tour.id}`);
    } else {
      await apiFetch(`/api/admin/v1/tours/${tourId}`, { method: "PATCH", body: data });
      setSaved(true);
      router.refresh();
    }
  });

  const set =
    (k: keyof Values) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setSaved(false);
      setValues((v) => ({ ...v, [k]: e.target.value }));
    };
  const err = (k: string) => pickError(errors, k);

  return (
    <form
      noValidate
      className="space-y-5"
      aria-label={mode === "create" ? "Create tour" : "Tour details"}
      onSubmit={(e) => {
        e.preventDefault();
        void submit(values);
      }}
    >
      <FormError message={formError} />
      {saved && <Alert tone="info">Tour details saved.</Alert>}
      <Field id="tour-name" label="Tour name" required error={err("name")}>
        <Input
          {...controlProps("tour-name", err("name"))}
          value={values.name}
          onChange={set("name")}
          maxLength={120}
          required
        />
      </Field>
      <Field
        id="tour-description"
        label="Description"
        error={err("description")}
        hint="Internal note for your team. Visitors don't see it."
      >
        <Textarea
          {...controlProps("tour-description", err("description"), "hint")}
          value={values.description}
          onChange={set("description")}
          maxLength={500}
          rows={3}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id="tour-startUrl"
          label="Start URL (path)"
          required
          error={err("startUrl")}
          hint={
            <>
              Where the tour may start. Use <code>*</code> as a wildcard, e.g.{" "}
              <code>/products/*</code>.
            </>
          }
        >
          <Input
            {...controlProps("tour-startUrl", err("startUrl"), "hint")}
            value={values.startUrl}
            onChange={set("startUrl")}
            className="font-mono"
            spellCheck={false}
            required
          />
        </Field>
        <Field
          id="tour-trigger"
          label="Trigger"
          error={err("triggerType")}
          hint="Automatic shows once per visitor. Manual starts from your code."
        >
          <NativeSelect
            {...controlProps("tour-trigger", err("triggerType"), "hint")}
            value={values.triggerType}
            onChange={set("triggerType")}
          >
            <option value="AUTO">Automatic</option>
            <option value="MANUAL">Manual (ProductTour.start)</option>
          </NativeSelect>
        </Field>
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting && <Loader2 className="animate-spin" aria-hidden />}
        {mode === "create"
          ? submitting
            ? "Creating…"
            : "Create tour"
          : submitting
            ? "Saving…"
            : "Save details"}
      </Button>
    </form>
  );
}
