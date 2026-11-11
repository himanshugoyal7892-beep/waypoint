"use client";

import { PRODUCT, type BuilderPassResponse } from "@waypoint/shared";
import { ExternalLink, Loader2, MousePointerClick } from "lucide-react";
import * as React from "react";
import { CopyButton } from "@/components/common";
import { Field, FormError, controlProps } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, NativeSelect } from "@/components/ui/input";
import { ApiClientError, apiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

function codeFromLaunchUrl(launchUrl: string): string {
  try {
    return (
      new URLSearchParams(new URL(launchUrl).hash.slice(1)).get(PRODUCT.sdk.builderPassHashParam) ??
      ""
    );
  } catch {
    return "";
  }
}

export function BuilderPassCard({
  projectId,
  projectKey,
  tourId,
  defaultUrl,
}: {
  projectId: string;
  projectKey: string;
  tourId: string;
  defaultUrl: string;
}) {
  const [targetUrl, setTargetUrl] = React.useState(defaultUrl);
  const [mode, setMode] = React.useState<"BUILD" | "PREVIEW">("BUILD");
  const [pass, setPass] = React.useState<BuilderPassResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldError, setFieldError] = React.useState<string | undefined>();
  const [busy, setBusy] = React.useState(false);
  const code = pass ? codeFromLaunchUrl(pass.launchUrl) : "";

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFieldError(undefined);
    try {
      const { builderSession } = await apiFetch<{ builderSession: BuilderPassResponse }>(
        `/api/admin/v1/projects/${projectId}/builder-sessions`,
        { method: "POST", body: { mode, tourId, targetUrl } },
      );
      setPass(builderSession);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
        setFieldError(err.fieldErrors().targetUrl);
      } else setError("Couldn't create a builder code.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    if (!pass) return;
    try {
      await apiFetch(`/api/admin/v1/builder-sessions/${pass.id}`, { method: "DELETE" });
      setPass(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't revoke the code.");
    }
  }

  return (
    <Card id="builder">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MousePointerClick className="size-4" aria-hidden /> Visual builder
        </CardTitle>
        <CardDescription>
          Build steps by clicking elements on your website. You get a one-time builder code that
          works for two hours on one website.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          onSubmit={generate}
          noValidate
          className="grid gap-4 sm:grid-cols-[1fr_9rem_auto] sm:items-end"
        >
          <Field
            id="builder-url"
            label="Website page"
            error={fieldError}
            hint="Must be on one of the project's allowed origins."
          >
            <Input
              {...controlProps("builder-url", fieldError, "hint")}
              type="url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              className="font-mono"
            />
          </Field>
          <Field id="builder-mode" label="Access">
            <NativeSelect
              {...controlProps("builder-mode")}
              value={mode}
              onChange={(e) => setMode(e.target.value as "BUILD" | "PREVIEW")}
            >
              <option value="BUILD">Edit</option>
              <option value="PREVIEW">Preview only</option>
            </NativeSelect>
          </Field>
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="animate-spin" aria-hidden />} Open visual builder
          </Button>
        </form>
        <FormError message={error} />
        {pass && code && (
          <div className="space-y-3 rounded-md border border-border bg-muted/40 p-4">
            <div>
              <p className="text-sm font-medium">Your builder code</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <code className="break-all rounded bg-background px-2 py-1 text-xs">{code}</code>
                <CopyButton value={code} label="Copy code" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Works once, expires {formatDate(pass.expiresAt)}. Anyone with it can edit this
                project&apos;s tours until then, so don&apos;t share it.
              </p>
            </div>
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              <li>
                Open the website page above{" "}
                <a
                  href={targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary underline"
                >
                  (open <ExternalLink className="size-3" aria-hidden />)
                </a>
                .
              </li>
              <li>
                Click your <strong>Waypoint builder</strong> bookmark. Don&apos;t have it?{" "}
                <a
                  href={`/sdk/preview.html?key=${encodeURIComponent(projectKey)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Get the bookmarks
                </a>
                .
              </li>
              <li>Paste this code into the builder panel and click Connect.</li>
            </ol>
            <p className="text-xs text-muted-foreground">
              If the install snippet is already on the website, you can skip the bookmark:{" "}
              <a
                href={pass.launchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                open the builder directly
              </a>
              .
            </p>
            <Button size="sm" variant="ghost" onClick={revoke}>
              Revoke code
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
