"use client";

import type { PublishIssue, TourStatus } from "@waypoint/shared";
import { Archive, ArchiveRestore, Loader2, Rocket, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { TourStatusBadge } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { ApiClientError, apiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

type Action = "publish" | "unpublish" | "archive" | "restore";

/** Links an issue to the place where it can be fixed. */
function issueHref(issue: PublishIssue, base: string, projectHref: string): string | null {
  if (issue.stepId) return `${base}/steps/${issue.stepId}`;
  if (issue.code === "NO_ALLOWED_ORIGIN") return projectHref;
  if (issue.code === "NO_STEPS") return `${base}/steps/new`;
  return null;
}

export function TourStatusControls({
  tourId,
  status,
  publishedAt,
  initialIssues,
  tourHref,
  projectHref,
}: {
  tourId: string;
  status: TourStatus;
  publishedAt: string | null;
  initialIssues: PublishIssue[];
  tourHref: string;
  projectHref: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<Action | null>(null);
  const [issues, setIssues] = React.useState<PublishIssue[]>(initialIssues);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => setIssues(initialIssues), [initialIssues]);

  async function run(action: Action) {
    setBusy(action);
    setError(null);
    try {
      await apiFetch(`/api/admin/v1/tours/${tourId}/${action}`, { method: "POST" });
      if (action === "publish") setIssues([]);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "PUBLISH_VALIDATION_FAILED")
        setIssues(err.details as PublishIssue[]);
      else setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  const spin = (a: Action) =>
    busy === a ? <Loader2 className="animate-spin" aria-hidden /> : null;

  return (
    <section aria-labelledby="publishing-heading" className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="publishing-heading" className="text-sm font-semibold">
          Status
        </h2>
        <TourStatusBadge status={status} />
        {status === "PUBLISHED" && (
          <span className="text-xs text-muted-foreground">since {formatDate(publishedAt)}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {status === "DRAFT" && (
          <Button onClick={() => run("publish")} disabled={busy !== null}>
            {spin("publish") ?? <Rocket aria-hidden />} Publish
          </Button>
        )}
        {status === "PUBLISHED" && (
          <Button variant="outline" onClick={() => run("unpublish")} disabled={busy !== null}>
            {spin("unpublish") ?? <Undo2 aria-hidden />} Unpublish
          </Button>
        )}
        {status !== "ARCHIVED" ? (
          <Button variant="ghost" onClick={() => run("archive")} disabled={busy !== null}>
            {spin("archive") ?? <Archive aria-hidden />} Archive
          </Button>
        ) : (
          <Button variant="outline" onClick={() => run("restore")} disabled={busy !== null}>
            {spin("restore") ?? <ArchiveRestore aria-hidden />} Restore to draft
          </Button>
        )}
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {issues.length > 0 && status !== "PUBLISHED" && (
        <Alert
          tone="warning"
          title={`Fix ${issues.length} issue${issues.length === 1 ? "" : "s"} before publishing`}
        >
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {issues.map((issue, i) => {
              const href = issueHref(issue, tourHref, projectHref);
              return (
                <li key={`${issue.code}-${issue.stepId ?? i}`}>
                  {href ? (
                    <Link href={href} className="underline underline-offset-2">
                      {issue.message}
                    </Link>
                  ) : (
                    issue.message
                  )}
                </li>
              );
            })}
          </ul>
        </Alert>
      )}
      {status === "PUBLISHED" && (
        <p className="text-xs text-muted-foreground">
          Edits to a published tour go live for visitors as soon as you save them.
        </p>
      )}
    </section>
  );
}
