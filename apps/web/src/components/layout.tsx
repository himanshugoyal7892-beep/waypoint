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
        "flex flex-col items-center rounded-2xl border border-dashed border-[#c9cceb] bg-white/70 px-6 py-12 text-center",
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
  amber: "bg-[#fff4e0] text-[#b06a00]",
  green: "bg-[#e6f6ee] text-[#1d7a4b]",
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
    <div
      className={cn(
        "rounded-xl border border-border bg-white p-5 shadow-[0_1px_2px_rgb(27_31_75/0.05)]",
        className,
      )}
    >
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
    DRAFT: { variant: "warning", label: "Draft" },
    PUBLISHED: { variant: "success", label: "Published" },
    ARCHIVED: { variant: "muted", label: "Archived" },
  } as const;
  const { variant, label } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}
