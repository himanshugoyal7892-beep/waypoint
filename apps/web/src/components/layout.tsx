import Link from "next/link";
import * as React from "react";
import { RouteIllustration } from "@/components/brand";
import { Badge } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: { href: string; label: string }[];
}) {
  return (
    <div className="mb-8 space-y-3">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            {breadcrumbs.map((b, i) => (
              <li key={b.href} className="flex items-center gap-1.5">
                {i > 0 && (
                  <span aria-hidden className="text-border">
                    /
                  </span>
                )}
                <Link href={b.href} className="rounded hover:text-foreground hover:underline">
                  {b.label}
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <h1 className="text-[28px] leading-tight font-semibold sm:text-[32px]">{title}</h1>
          {description && (
            <p className="max-w-2xl text-[15px] text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
  variant = "project",
}: {
  /** Kept for compatibility; the route illustration replaces generic icons. */
  icon?: React.ReactNode;
  title: string;
  description: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  variant?: "project" | "tour" | "step" | "data";
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-dashed border-border-strong bg-card/70 px-6 py-12 text-center",
        className,
      )}
    >
      <RouteIllustration variant={variant} />
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

const STAT_TONES = {
  indigo: "bg-primary-soft text-primary",
  amber: "bg-warning-soft text-warning",
  green: "bg-success-soft text-success",
  slate: "bg-muted text-muted-foreground",
} as const;

/** A number with its meaning. The icon chip colour groups related stats. */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "indigo",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: keyof typeof STAT_TONES;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5 shadow-card", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        {icon && (
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-lg [&_svg]:size-4",
              STAT_TONES[tone],
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 font-display text-3xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function TourStatusBadge({ status }: { status: "DRAFT" | "PUBLISHED" | "ARCHIVED" }) {
  const map = {
    DRAFT: { variant: "warning", label: "Draft", dot: "bg-warning-strong" },
    PUBLISHED: { variant: "success", label: "Published", dot: "bg-success-solid" },
    ARCHIVED: { variant: "muted", label: "Archived", dot: "bg-muted-foreground/60" },
  } as const;
  const { variant, label, dot } = map[status];
  return (
    <Badge variant={variant}>
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          dot,
          status === "PUBLISHED" && "motion-safe:animate-pulse",
        )}
      />
      {label}
    </Badge>
  );
}

/** Section tabs as links (each tab is its own URL, so it survives refresh and sharing). */
export function TabNav({
  label,
  tabs,
  current,
}: {
  label: string;
  tabs: { key: string; label: string; href: string; icon?: React.ReactNode; count?: number }[];
  current: string;
}) {
  return (
    <nav
      aria-label={label}
      className="mb-6 inline-flex max-w-full gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 shadow-card"
    >
      {tabs.map((t) => {
        const on = t.key === current;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors [&_svg]:size-4",
              on
                ? "bg-primary-soft text-primary shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {t.icon}
            {t.label}
            {t.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs tabular-nums",
                  on ? "bg-primary/15" : "bg-muted",
                )}
              >
                {t.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
