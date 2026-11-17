"use client";

import {
  ExternalLink,
  Loader2,
  PenLine,
  ScanSearch,
  Sparkles,
  WandSparkles,
  ListChecks,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Field, FormError, controlProps } from "@/components/field";
import { TourForm } from "@/components/forms/tour-form";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ApiClientError, apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const GOALS = ["Find products fast", "Become a partner", "Request a quote", "Track orders"];

/**
 * New tour: "Draft with AI" (opens the site with the builder, which scans the page and proposes
 * steps) or "Start from scratch" (the plain form).
 */
export function NewTourChooser({
  projectId,
  siteOrigin,
}: {
  projectId: string;
  siteOrigin: string;
}) {
  const [mode, setMode] = React.useState<"ai" | "blank">("ai");
  return (
    <div className="space-y-6">
      <div role="radiogroup" aria-label="How to start" className="grid gap-3 sm:grid-cols-2">
        <Choice
          on={mode === "ai"}
          onSelect={() => setMode("ai")}
          icon={<Sparkles aria-hidden />}
          title="Draft with AI"
          tag="Fastest"
          text="Waypoint reads a page on your site and proposes the steps. You review them before anything is saved."
        />
        <Choice
          on={mode === "blank"}
          onSelect={() => setMode("blank")}
          icon={<PenLine aria-hidden />}
          title="Start from scratch"
          text="Name the tour and choose where it starts. Then add steps one by one."
        />
      </div>
      {mode === "ai" ? (
        <AiDraftPanel projectId={projectId} siteOrigin={siteOrigin} />
      ) : (
        <div className="max-w-2xl rounded-xl border border-border bg-card p-5 shadow-card sm:p-6">
          <TourForm mode="create" projectId={projectId} />
        </div>
      )}
    </div>
  );
}

function Choice({
  on,
  onSelect,
  icon,
  title,
  tag,
  text,
}: {
  on: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  tag?: string;
  text: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onSelect}
      className={cn(
        "flex items-start gap-3 rounded-xl border bg-card p-4 text-left shadow-card transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        on ? "border-primary ring-1 ring-primary" : "border-border hover:border-border-strong",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4",
          on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2 font-semibold">
          {title}
          {tag && (
            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary">
              {tag}
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{text}</span>
      </span>
    </button>
  );
}

function AiDraftPanel({ projectId, siteOrigin }: { projectId: string; siteOrigin: string }) {
  const router = useRouter();
  const toast = useToast();
  const [url, setUrl] = React.useState(`${siteOrigin}/`);
  const [goal, setGoal] = React.useState("");
  const [steps, setSteps] = React.useState("6");
  const [trigger, setTrigger] = React.useState<"AUTO" | "MANUAL">("AUTO");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [urlError, setUrlError] = React.useState<string | undefined>();

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setUrlError(undefined);
    let page: URL;
    try {
      page = new URL(url);
    } catch {
      setUrlError("Enter the full address, e.g. https://www.example.com/en-ae");
      return;
    }
    // Open the tab now, while the click still counts as a user action (pop-up blockers).
    const tab = window.open("about:blank", "_blank");
    setBusy(true);
    try {
      const path = page.pathname || "/";
      const { tour } = await apiFetch<{ tour: { id: string } }>(
        `/api/admin/v1/projects/${projectId}/tours`,
        {
          method: "POST",
          body: { name: `AI draft: ${path}`, startUrl: path, triggerType: trigger },
        },
      );
      const { builderSession } = await apiFetch<{ builderSession: { launchUrl: string } }>(
        `/api/admin/v1/projects/${projectId}/builder-sessions`,
        { method: "POST", body: { mode: "BUILD", tourId: tour.id, targetUrl: page.toString() } },
      );
      const ai = new URLSearchParams({ ai: "1", goal: goal.trim(), steps });
      const launch = `${builderSession.launchUrl}&${ai.toString()}`;
      if (tab) {
        tab.opener = null;
        tab.location.href = launch;
      } else window.open(launch, "_blank", "noopener");
      toast.success(
        "Your site is open in a new tab",
        "Review the draft there. Steps appear here once you add them.",
      );
      router.push(`/dashboard/projects/${projectId}/tours/${tour.id}`);
    } catch (err) {
      tab?.close();
      if (err instanceof ApiClientError) {
        setError(err.message);
        setUrlError(err.fieldErrors().targetUrl);
      } else setError("Couldn't start the draft. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <form
        onSubmit={start}
        noValidate
        className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-card sm:p-6"
        aria-label="Draft a tour with AI"
      >
        <FormError message={error} />
        <Field
          id="ai-url"
          label="Page to start on"
          required
          error={urlError}
          hint="A page on one of this project's websites. Logged-in pages work too: log in on that tab first."
        >
          <Input
            {...controlProps("ai-url", urlError, "hint")}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="font-mono"
            spellCheck={false}
          />
        </Field>
        <Field
          id="ai-goal"
          label="What should the tour help visitors do?"
          hint="Optional. The draft favours these parts of the page."
        >
          <Textarea
            {...controlProps("ai-goal", undefined, "hint")}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            maxLength={300}
            rows={2}
            placeholder="e.g. help new partners find products and request a quote"
          />
        </Field>
        <div className="-mt-2 flex flex-wrap gap-1.5" aria-label="Goal ideas">
          {GOALS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGoal((v) => (v ? `${v}, ${g.toLowerCase()}` : g))}
              className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              + {g}
            </button>
          ))}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="ai-steps" label="Length">
            <Select id="ai-steps" value={steps} onChange={(e) => setSteps(e.target.value)}>
              {["4", "5", "6", "8", "10"].map((n) => (
                <option key={n} value={n}>
                  {n} steps
                </option>
              ))}
            </Select>
          </Field>
          <Field id="ai-trigger" label="Starts">
            <Select
              id="ai-trigger"
              value={trigger}
              onChange={(e) => setTrigger(e.target.value as "AUTO" | "MANUAL")}
            >
              <option value="AUTO">Automatically</option>
              <option value="MANUAL">From a link only</option>
            </Select>
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button type="submit" disabled={busy} size="lg">
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : <WandSparkles aria-hidden />}
            {busy ? "Opening your site…" : "Open my site and draft"}
          </Button>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <ExternalLink className="size-3" aria-hidden /> Opens in a new tab. Nothing is saved
            until you add the steps.
          </span>
        </div>
      </form>

      <HowItWorks />
    </div>
  );
}

/** A small animated picture of what happens on the site: scan, draft, review. */
function HowItWorks() {
  const stages = [
    {
      Icon: ScanSearch,
      title: "Reads the page",
      text: "Buttons, links, search and headings. Never what anyone typed.",
    },
    {
      Icon: Sparkles,
      title: "Drafts the steps",
      text: "Picks the parts that matter and writes a short tip for each.",
    },
    {
      Icon: ListChecks,
      title: "You decide",
      text: "Hover to see each element, edit the text, untick, then add.",
    },
  ];
  return (
    <aside
      aria-label="How AI drafting works"
      className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-card"
    >
      <div
        aria-hidden
        className="relative h-44 overflow-hidden rounded-lg border border-border bg-[#f1f3f9]"
      >
        <div className="flex h-7 items-center gap-1.5 border-b border-[#e3e6f1] bg-white px-2.5">
          <span className="size-1.5 rounded-full bg-[#f3a3a3]" />
          <span className="size-1.5 rounded-full bg-[#f3d38a]" />
          <span className="size-1.5 rounded-full bg-[#a6dcb4]" />
          <span className="ml-1.5 h-3 flex-1 rounded bg-[#f1f3f9]" />
        </div>
        <div className="space-y-2 p-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-12 rounded bg-[#d6d9e8]" />
            <span className="wp-ai-pin relative h-5 flex-1 rounded-md bg-white [--d:0s]" />
            <span className="h-3 w-8 rounded bg-[#e3e6f1]" />
          </div>
          <div className="wp-ai-pin relative h-3 w-2/3 rounded bg-white [--d:.6s]" />
          <div className="grid grid-cols-3 gap-2">
            <span className="h-14 rounded-md bg-white" />
            <span className="wp-ai-pin relative h-14 rounded-md bg-white [--d:1.2s]" />
            <span className="h-14 rounded-md bg-white" />
          </div>
        </div>
        <span className="wp-ai-scan absolute inset-x-0 top-7 h-10 bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
      </div>
      <ol className="space-y-3">
        {stages.map(({ Icon, title, text }) => (
          <li key={title} className="flex gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Icon className="size-4" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-medium">{title}</span>
              <span className="block text-xs text-muted-foreground">{text}</span>
            </span>
          </li>
        ))}
      </ol>
    </aside>
  );
}
