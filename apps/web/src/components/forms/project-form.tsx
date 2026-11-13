"use client";

import { createProjectSchema, updateProjectSchema } from "@waypoint/shared";
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

type IdentitySource = "NONE" | "WINDOW" | "DATALAYER" | "COOKIE";

interface Values {
  name: string;
  domain: string;
  allowedOrigins: string;
  identitySource: IdentitySource;
  identityKey: string;
}

const IDENTITY_HELP: Record<IdentitySource, React.ReactNode> = {
  NONE: "Each browser counts as one visitor. Fine for “everyone” tours.",
  WINDOW: (
    <>
      A JavaScript variable on your pages that holds the user id, e.g. <code>userId</code> or{" "}
      <code>app.user.id</code>.
    </>
  ),
  DATALAYER: (
    <>
      A field your site sends to Google Tag Manager, e.g. <code>customer_code</code>. Waypoint uses
      the latest non-empty value.
    </>
  ),
  COOKIE: (
    <>
      A cookie that holds the user id. It must be readable by page scripts (not{" "}
      <code>HttpOnly</code>).
    </>
  ),
};

export function ProjectForm({
  mode,
  projectId,
  initial = { name: "", domain: "", allowedOrigins: [] },
}: {
  mode: "create" | "edit";
  projectId?: string;
  initial?: {
    name: string;
    domain: string;
    allowedOrigins: string[];
    identitySource?: IdentitySource;
    identityKey?: string | null;
  };
}) {
  const router = useRouter();
  const [values, setValues] = React.useState<Values>({
    name: initial.name,
    domain: initial.domain,
    allowedOrigins: initial.allowedOrigins.join("\n"),
    identitySource: initial.identitySource ?? "NONE",
    identityKey: initial.identityKey ?? "",
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
    (k: keyof Values) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
      ...(mode === "edit"
        ? { identitySource: values.identitySource, identityKey: values.identityKey }
        : {}),
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
      {mode === "edit" && (
        <fieldset id="identity" className="space-y-4 rounded-lg border border-border p-4">
          <legend className="px-1 text-sm font-semibold">Recognise logged-in users</legend>
          <p className="text-sm text-muted-foreground">
            Lets tours target new, returning or existing users, and remembers them across devices.
            No code change on your site: tell Waypoint where your pages already keep the user id.
            Only a one-way hash of the id is stored.
          </p>
          <Field
            id="identitySource"
            label="Where to find the user id"
            hint={IDENTITY_HELP[values.identitySource]}
            error={err("identitySource")}
          >
            <NativeSelect
              {...controlProps("identitySource", err("identitySource"), "hint")}
              value={values.identitySource}
              onChange={set("identitySource")}
            >
              <option value="NONE">Don’t recognise users</option>
              <option value="WINDOW">Page variable</option>
              <option value="DATALAYER">Google Tag Manager field</option>
              <option value="COOKIE">Cookie</option>
            </NativeSelect>
          </Field>
          {values.identitySource !== "NONE" && (
            <Field
              id="identityKey"
              label={
                values.identitySource === "WINDOW"
                  ? "Variable name"
                  : values.identitySource === "DATALAYER"
                    ? "Field name"
                    : "Cookie name"
              }
              required
              error={err("identityKey")}
              hint="Use an id or customer code. Avoid email addresses or phone numbers."
            >
              <Input
                {...controlProps("identityKey", err("identityKey"), "hint")}
                value={values.identityKey}
                onChange={set("identityKey")}
                className="font-mono"
                spellCheck={false}
                autoComplete="off"
                placeholder={values.identitySource === "DATALAYER" ? "customer_code" : "userId"}
              />
            </Field>
          )}
        </fieldset>
      )}
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
