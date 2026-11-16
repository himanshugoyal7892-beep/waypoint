"use client";

import { createProjectSchema, updateProjectSchema } from "@waypoint/shared";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useToast } from "@/components/toast";
import type { ZodTypeAny } from "zod";
import { Field, FormError, controlProps } from "@/components/field";
import { Button } from "@/components/ui/button";
import { TipPreview } from "@/components/tip-preview";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { apiFetch } from "@/lib/api-client";
import { pickError, useFormSubmit } from "./use-form-submit";

type IdentitySource = "NONE" | "WINDOW" | "DATALAYER" | "COOKIE";

interface Values {
  name: string;
  domain: string;
  allowedOrigins: string;
  identitySource: IdentitySource;
  identityKey: string;
  maxAutoToursPerVisit: string;
  themeColor: string;
  tipStyle: "LIGHT" | "DARK" | "BRAND";
  tipCorners: "ROUNDED" | "SOFT" | "SQUARE";
  tipProgress: "COUNTER" | "DOTS" | "BAR" | "NONE";
  tipFont: "SYSTEM" | "SITE";
  tipBackdrop: boolean;
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
    maxAutoToursPerVisit?: number | null;
    themeColor?: string | null;
    tipStyle?: Values["tipStyle"];
    tipCorners?: Values["tipCorners"];
    tipProgress?: Values["tipProgress"];
    tipFont?: Values["tipFont"];
    tipBackdrop?: boolean;
  };
}) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = React.useState<Values>({
    name: initial.name,
    domain: initial.domain,
    allowedOrigins: initial.allowedOrigins.join("\n"),
    identitySource: initial.identitySource ?? "NONE",
    identityKey: initial.identityKey ?? "",
    maxAutoToursPerVisit: initial.maxAutoToursPerVisit?.toString() ?? "",
    themeColor: initial.themeColor ?? "",
    tipStyle: initial.tipStyle ?? "LIGHT",
    tipCorners: initial.tipCorners ?? "ROUNDED",
    tipProgress: initial.tipProgress ?? "COUNTER",
    tipFont: initial.tipFont ?? "SYSTEM",
    tipBackdrop: initial.tipBackdrop ?? true,
  });
  const schema: ZodTypeAny = mode === "create" ? createProjectSchema : updateProjectSchema;
  const { errors, formError, submitting, submit } = useFormSubmit(schema, async (data) => {
    if (mode === "create") {
      const { project } = await apiFetch<{ project: { id: string } }>("/api/admin/v1/projects", {
        method: "POST",
        body: data,
      });
      toast.success("Project created");
      router.push(`/dashboard/projects/${project.id}/install`);
    } else {
      await apiFetch(`/api/admin/v1/projects/${projectId}`, { method: "PATCH", body: data });
      toast.success("Settings saved");
      router.refresh();
    }
  });

  const set =
    (k: keyof Values) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
        ? {
            identitySource: values.identitySource,
            identityKey: values.identityKey,
            maxAutoToursPerVisit: values.maxAutoToursPerVisit,
            themeColor: values.themeColor,
            tipStyle: values.tipStyle,
            tipCorners: values.tipCorners,
            tipProgress: values.tipProgress,
            tipFont: values.tipFont,
            tipBackdrop: values.tipBackdrop,
          }
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
            <Select
              {...controlProps("identitySource", err("identitySource"), "hint")}
              value={values.identitySource}
              onChange={set("identitySource")}
            >
              <option value="NONE">Don’t recognise users</option>
              <option value="WINDOW">Page variable</option>
              <option value="DATALAYER">Google Tag Manager field</option>
              <option value="COOKIE">Cookie</option>
            </Select>
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
      {mode === "edit" && (
        <fieldset id="display" className="space-y-4 rounded-lg border border-border p-4">
          <legend className="px-1 text-sm font-semibold">Tour display</legend>
          <p className="text-sm text-muted-foreground">
            How tips look to your visitors, and how often they appear.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="maxAutoToursPerVisit"
              label="Automatic tours per visit"
              hint="Leave empty for no limit. 1 means a visitor sees at most one automatic tour per visit."
              error={err("maxAutoToursPerVisit")}
            >
              <Input
                {...controlProps("maxAutoToursPerVisit", err("maxAutoToursPerVisit"), "hint")}
                type="number"
                min={1}
                max={10}
                inputMode="numeric"
                placeholder="No limit"
                value={values.maxAutoToursPerVisit}
                onChange={set("maxAutoToursPerVisit")}
              />
            </Field>
            <Field
              id="themeColor"
              label="Brand colour"
              hint="Used for the tour buttons and the highlight ring. Empty uses Waypoint’s blue."
              error={err("themeColor")}
            >
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Pick brand colour"
                  className="h-9 w-12 cursor-pointer rounded-md border border-border bg-background p-1"
                  value={
                    /^#[0-9a-fA-F]{6}$/.test(values.themeColor) ? values.themeColor : "#3b4fd8"
                  }
                  onChange={set("themeColor")}
                />
                <Input
                  {...controlProps("themeColor", err("themeColor"), "hint")}
                  value={values.themeColor}
                  onChange={set("themeColor")}
                  placeholder="#3B4FD8"
                  className="font-mono"
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
            </Field>
          </div>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="grid content-start gap-4 sm:grid-cols-2">
              <Field id="tipStyle" label="Tip style">
                <Select
                  id="tipStyle"
                  value={values.tipStyle}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, tipStyle: e.target.value as Values["tipStyle"] }))
                  }
                >
                  <option value="LIGHT">Light</option>
                  <option value="DARK">Dark</option>
                  <option value="BRAND">Brand colour</option>
                </Select>
              </Field>
              <Field id="tipCorners" label="Corners">
                <Select
                  id="tipCorners"
                  value={values.tipCorners}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, tipCorners: e.target.value as Values["tipCorners"] }))
                  }
                >
                  <option value="ROUNDED">Rounded</option>
                  <option value="SOFT">Soft</option>
                  <option value="SQUARE">Square</option>
                </Select>
              </Field>
              <Field id="tipProgress" label="Progress">
                <Select
                  id="tipProgress"
                  value={values.tipProgress}
                  onChange={(e) =>
                    setValues((v) => ({
                      ...v,
                      tipProgress: e.target.value as Values["tipProgress"],
                    }))
                  }
                >
                  <option value="COUNTER">“2 of 4”</option>
                  <option value="DOTS">Dots</option>
                  <option value="BAR">Bar</option>
                  <option value="NONE">Hidden</option>
                </Select>
              </Field>
              <Field id="tipFont" label="Font">
                <Select
                  id="tipFont"
                  value={values.tipFont}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, tipFont: e.target.value as Values["tipFont"] }))
                  }
                >
                  <option value="SYSTEM">Standard</option>
                  <option value="SITE">Same as website</option>
                </Select>
              </Field>
              <Switch
                id="tipBackdrop"
                className="sm:col-span-2"
                checked={values.tipBackdrop}
                onCheckedChange={(c) => setValues((v) => ({ ...v, tipBackdrop: c }))}
                label="Dim the page behind the tip"
                hint="Helps the highlighted element stand out."
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Preview</p>
              <TipPreview
                brand={values.themeColor || null}
                tip={{
                  style: values.tipStyle,
                  corners: values.tipCorners,
                  progress: values.tipProgress,
                  font: values.tipFont,
                  backdrop: values.tipBackdrop,
                }}
              />
              <p className="text-xs text-muted-foreground">
                “Same as website” uses your site&apos;s own font on the live page.
              </p>
            </div>
          </div>
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
