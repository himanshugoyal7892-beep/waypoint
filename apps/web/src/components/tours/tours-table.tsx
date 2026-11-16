"use client";

import { ArrowDown, ArrowUp, BarChart3, Hand, Pencil, Search, Zap } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { HealthBadge } from "@/components/insights";
import { TourStatusBadge } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { HealthResult as TourHealth } from "@/server/insights/health";
import { cn } from "@/lib/utils";

export interface TourRow {
  id: string;
  name: string;
  description: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  startUrl: string;
  triggerType: "AUTO" | "MANUAL";
  steps: number;
  updatedAt: string;
  health: TourHealth | null;
}

type SortKey = "name" | "health" | "steps" | "updatedAt";

const rel = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
function ago(iso: string) {
  const mins = Math.round((Date.parse(iso) - Date.now()) / 60000);
  if (Math.abs(mins) < 60) return rel.format(mins, "minute");
  const hours = Math.round(mins / 60);
  if (Math.abs(hours) < 24) return rel.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return rel.format(days, "day");
  return new Date(iso).toLocaleDateString("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ToursTable({ rows, base }: { rows: TourRow[]; base: string }) {
  const [q, setQ] = React.useState("");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: 1 | -1 }>({
    key: "updatedAt",
    dir: -1,
  });

  const shown = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? rows.filter((r) =>
          [r.name, r.description ?? "", r.startUrl].some((s) => s.toLowerCase().includes(needle)),
        )
      : rows;
    const val = (r: TourRow): string | number =>
      sort.key === "health"
        ? (r.health?.score ?? -1)
        : sort.key === "updatedAt"
          ? Date.parse(r.updatedAt)
          : sort.key === "steps"
            ? r.steps
            : r.name.toLowerCase();
    return [...list].sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * sort.dir);
  }, [rows, q, sort]);

  const header = (key: SortKey, label: string, className?: string) => {
    const on = sort.key === key;
    return (
      <th
        scope="col"
        aria-sort={on ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
        className={cn("px-4 py-2.5 font-medium", className)}
      >
        <button
          type="button"
          onClick={() =>
            setSort((s) => ({
              key,
              dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === "name" ? 1 : -1,
            }))
          }
          className={cn(
            "inline-flex items-center gap-1 rounded hover:text-foreground",
            on && "text-foreground",
          )}
        >
          {label}
          {on &&
            (sort.dir === 1 ? (
              <ArrowUp className="size-3" aria-hidden />
            ) : (
              <ArrowDown className="size-3" aria-hidden />
            ))}
        </button>
      </th>
    );
  };

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          aria-label="Search tours"
          placeholder="Search by name or page"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="bg-card pl-9"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Tours in this project. Column headers sort the list.
          </caption>
          <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              {header("name", "Tour")}
              <th scope="col" className="px-4 py-2.5 font-medium">
                Status
              </th>
              {header("health", "Health")}
              {header("steps", "Steps", "text-right")}
              {header("updatedAt", "Updated")}
              <th scope="col" className="px-4 py-2.5">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {shown.map((t) => (
              <tr key={t.id} className="group relative transition-colors hover:bg-muted/50">
                <td className="max-w-[26rem] px-4 py-3">
                  <Link
                    href={`${base}/tours/${t.id}`}
                    className="font-medium after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-hover:text-primary"
                  >
                    {t.name}
                  </Link>
                  <p className="mt-0.5 flex items-center gap-2 truncate text-xs text-muted-foreground">
                    <span
                      className="inline-flex items-center gap-1"
                      title={
                        t.triggerType === "AUTO" ? "Starts automatically" : "Starts from a link"
                      }
                    >
                      {t.triggerType === "AUTO" ? (
                        <Zap className="size-3" aria-hidden />
                      ) : (
                        <Hand className="size-3" aria-hidden />
                      )}
                      {t.triggerType === "AUTO" ? "Automatic" : "Manual"}
                    </span>
                    <span aria-hidden>on</span>
                    <span className="truncate font-mono">{t.startUrl}</span>
                  </p>
                </td>
                <td className="px-4 py-3">
                  <TourStatusBadge status={t.status} />
                </td>
                <td className="px-4 py-3">
                  {t.health ? (
                    <HealthBadge health={t.health} size="sm" />
                  ) : (
                    <span className="text-xs text-muted-foreground">Not enough data</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{t.steps}</td>
                <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">
                  <time dateTime={t.updatedAt} title={new Date(t.updatedAt).toLocaleString()}>
                    {ago(t.updatedAt)}
                  </time>
                </td>
                <td className="relative z-10 px-3 py-3">
                  <div className="flex justify-end gap-1 opacity-70 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`${base}/tours/${t.id}`} aria-label={`Edit ${t.name}`}>
                        <Pencil aria-hidden />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                      <Link
                        href={`${base}/tours/${t.id}/analytics`}
                        aria-label={`Analytics for ${t.name}`}
                      >
                        <BarChart3 aria-hidden />
                      </Link>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No tours match “{q}”.{" "}
                  <button
                    type="button"
                    onClick={() => setQ("")}
                    className="font-medium text-primary hover:underline"
                  >
                    Clear search
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {shown.length} of {rows.length} {rows.length === 1 ? "tour" : "tours"}
      </p>
    </div>
  );
}
