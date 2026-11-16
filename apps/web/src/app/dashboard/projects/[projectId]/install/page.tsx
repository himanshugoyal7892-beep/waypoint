import { PRODUCT } from "@waypoint/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/common";
import { PageHeader } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/misc";
import { loadOr404 } from "@/lib/page-data";
import { requirePageUser } from "@/server/auth";
import { getInstallInstructions } from "@/server/services/install";

export const metadata: Metadata = { title: "Install" };

const ATTR_EXAMPLE = '<button data-tour-id="add-to-cart">Add to cart</button>';

export default async function InstallPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const user = await requirePageUser();
  const install = await loadOr404(() => getInstallInstructions(user.id, projectId));
  const base = `/dashboard/projects/${projectId}`;

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Install"
        description={`Add ${PRODUCT.name} to your website once. After that, tours are created and published from this dashboard.`}
      />

      <Card>
        <CardHeader>
          <CardTitle>1. Add the snippet</CardTitle>
          <CardDescription>
            Paste this just before <code>&lt;/body&gt;</code> on every page where tours should run.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <pre
            className="overflow-x-auto rounded-md bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-100"
            aria-label="Install snippet"
          >
            <code className="bg-transparent p-0 text-inherit">{install.snippet}</code>
          </pre>
          <div className="flex flex-wrap items-center gap-2">
            <CopyButton value={install.snippet} label="Copy snippet" />
            <span className="text-xs text-muted-foreground">
              Public key: <code>{install.publicKey}</code> (safe to expose: it only identifies the
              project)
            </span>
          </div>
          <Alert tone="info">
            Tours and analytics only work on the origins listed in step 2. Tours that are{" "}
            <strong>published</strong> and <strong>automatic</strong> start showing to visitors as
            soon as the snippet is live.
          </Alert>
        </CardContent>
      </Card>

      <Card id="gtm">
        <CardHeader>
          <CardTitle>Or install with Google Tag Manager</CardTitle>
          <CardDescription>
            No website release needed. Anyone with publish rights on the site&apos;s Tag Manager
            container can do this.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            <li>
              In Tag Manager, open <strong>Tags → New</strong> and choose{" "}
              <strong>Custom HTML</strong>. Name it &quot;{PRODUCT.name}&quot;.
            </li>
            <li>Paste the snippet above into the HTML box.</li>
            <li>
              Under <strong>Triggering</strong>, choose <strong>All Pages</strong>. Don&apos;t add a
              &quot;History Change&quot; trigger: {PRODUCT.name} follows page changes by itself.
            </li>
            <li>
              Click <strong>Preview</strong> and open your site from the Tag Assistant window. The
              tag only runs in that window, so you can test safely.
            </li>
            <li>
              When it works, click <strong>Submit → Publish</strong>. To switch {PRODUCT.name} off
              later, pause the tag and publish again.
            </li>
          </ol>
          <p className="mt-3 text-xs text-muted-foreground">
            Tip: for a quiet first launch, set tours to <strong>Manual</strong>. Visitors see
            nothing, and your team can still open each tour with its &quot;Start from a link&quot;
            URL.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Allow your site&apos;s origins</CardTitle>
          <CardDescription>
            Tours only load, and analytics are only accepted, from these exact origins.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {install.allowedOrigins.length ? (
            <ul className="space-y-1 font-mono text-sm">
              {install.allowedOrigins.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          ) : (
            <Alert tone="warning">No allowed origins yet.</Alert>
          )}
          <Link
            href={`${base}/settings#allowedOrigins`}
            className="mt-3 inline-block text-sm text-primary hover:underline"
          >
            Edit allowed origins
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Mark key elements (recommended)</CardTitle>
          <CardDescription>
            Stable attributes keep tours working when your CSS or layout changes. Use them as the
            step&apos;s CSS selector, e.g. <code>[data-tour-id=&quot;add-to-cart&quot;]</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
            <code className="bg-transparent p-0">{ATTR_EXAMPLE}</code>
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Content Security Policy</CardTitle>
          <CardDescription>
            If your site sends a CSP header, allow the SDK and API origins:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 font-mono text-sm">
            {install.cspDirectives.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
