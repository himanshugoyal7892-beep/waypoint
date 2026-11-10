"use client";

import { createProjectSchema, updateProjectSchema } from "@waypoint/shared";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import type { ZodTypeAny } from "zod";
import { Field, FormError, controlProps } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { apiFetch } from "@/lib/api-client";
import { pickError, useFormSubmit } from "./use-form-submit";

interface Values {
  name: string;
  domain: string;
  allowedOrigins: string;
}

export function ProjectForm({
  mode,
  projectId,
  initial = { name: "", domain: "", allowedOrigins: [] },
}: {
  mode: "create" | "edit";
  projectId?: string;
  initial?: { name: string; domain: string; allowedOrigins: string[] };
}) {
  const router = useRouter();
  const [values, setValues] = React.useState<Values>({
    ...initial,
    allowedOrigins: initial.allowedOrigins.join("\n"),
  });
  const [saved, setSaved] = React.useState(false);
  const schema: ZodTypeAny = mode === "create" ? createProjectSchema : updateProjectSchema;
  const { errors, formError, submitting, submit } = useFormSubmit(schema, async (data) => {
    if (mode === "create") {
      const { project } = await apiFetch<{ project: { id: string } }>("/api/admin/v1/projects", {
        method: "POST",
        body: data,
      });
      router.push(`/dashboard/projects/${project.id}/install`);
    } else {
      await apiFetch(`/api/admin/v1/projects/${projectId}`, { method: "PATCH", body: data });
      setSaved(true);
      router.refresh();
    }
  });

  const set =
    (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setSaved(false);
      setValues((v) => ({ ...v, [k]: e.target.value }));
    };

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void submit({
      name: values.name,
      domain: values.domain,
      allowedOrigins: values.allowedOrigins
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean),
    });
  }

  const err = (k: string) => pickError(errors, k);

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="space-y-5"
      aria-label={mode === "create" ? "Create project" : "Project settings"}
    >
      <FormError message={formError} />
      {saved && <Alert tone="info">Project settings saved.</Alert>}
      <Field id="name" label="Project name" required error={err("name")}>
        <Input
          {...controlProps("name", err("name"))}
          value={values.name}
          onChange={set("name")}
          maxLength={100}
          autoComplete="off"
          required
        />
      </Field>
      <Field
        id="domain"
        label="Primary domain"
        required
        error={err("domain")}
        hint="Shown in the dashboard, e.g. shop.example.com or localhost:5173."
      >
        <Input
          {...controlProps("domain", err("domain"), "hint")}
          value={values.domain}
          onChange={set("domain")}
          placeholder="shop.example.com"
          autoComplete="off"
          required
        />
      </Field>
      <Field
        id="allowedOrigins"
        label="Allowed origins"
        error={err("allowedOrigins")}
        hint={
          <>
            One per line, including the scheme, e.g. <code>https://shop.example.com</code> or{" "}
            <code>http://localhost:5173</code>. Tours only load, and analytics are only accepted,
            from these origins. At least one is required to publish.
          </>
        }
      >
        <Textarea
          {...controlProps("allowedOrigins", err("allowedOrigins"), "hint")}
          value={values.allowedOrigins}
          onChange={set("allowedOrigins")}
          rows={4}
          spellCheck={false}
          className="font-mono"
        />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="animate-spin" aria-hidden />}
          {mode === "create"
            ? submitting
              ? "Creating…"
              : "Create project"
            : submitting
              ? "Saving…"
              : "Save changes"}
        </Button>
        {mode === "create" && (
          <Button variant="ghost" onClick={() => router.back()} disabled={submitting}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
