"use client";

import type { BuilderPassResponse } from "@waypoint/shared";
import { ExternalLink, KeyRound, Loader2 } from "lucide-react";
import * as React from "react";
import { CopyButton } from "@/components/common";
import { Field, FormError, controlProps } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, NativeSelect } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { ApiClientError, apiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

export function BuilderPassCard({
  projectId,
  tourId,
  defaultUrl,
}: {
  projectId: string;
  tourId: string;
  defaultUrl: string;
}) {
  const [targetUrl, setTargetUrl] = React.useState(defaultUrl);
  const [mode, setMode] = React.useState<"BUILD" | "PREVIEW">("BUILD");
  const [pass, setPass] = React.useState<BuilderPassResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldError, setFieldError] = React.useState<string | undefined>();
  const [busy, setBusy] = React.useState(false);

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
      } else setError("Couldn't create a builder pass.");
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
      setError(err instanceof ApiClientError ? err.message : "Couldn't revoke the pass.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4" aria-hidden /> Builder pass
        </CardTitle>
        <CardDescription>
          Creates a single-use link that opens your site in builder or preview mode. It is valid for
          two hours and only works from the project&apos;s allowed origins.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert tone="info">
          The in-page builder and preview are added in the next phases. Until then this link opens
          your site without a builder panel.
        </Alert>
        <form
          onSubmit={generate}
          noValidate
          className="grid gap-4 sm:grid-cols-[1fr_10rem_auto] sm:items-end"
        >
          <Field id="builder-url" label="Open on page" error={fieldError}>
            <Input
              {...controlProps("builder-url", fieldError)}
              type="url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              className="font-mono"
            />
          </Field>
          <Field id="builder-mode" label="Mode">
            <NativeSelect
              {...controlProps("builder-mode")}
              value={mode}
              onChange={(e) => setMode(e.target.value as "BUILD" | "PREVIEW")}
            >
              <option value="BUILD">Build</option>
              <option value="PREVIEW">Preview</option>
            </NativeSelect>
          </Field>
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="animate-spin" aria-hidden />} Generate link
          </Button>
        </form>
        <FormError message={error} />
        {pass && (
          <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">
              Expires {formatDate(pass.expiresAt)}. Works once. Don&apos;t share it: anyone with
              this link can edit this project&apos;s tours until it expires.
            </p>
            <code className="block break-all rounded bg-background p-2 text-xs">
              {pass.launchUrl}
            </code>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" asChild>
                <a href={pass.launchUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink aria-hidden /> Open
                </a>
              </Button>
              <CopyButton value={pass.launchUrl} label="Copy link" />
              <Button size="sm" variant="ghost" onClick={revoke}>
                Revoke
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
