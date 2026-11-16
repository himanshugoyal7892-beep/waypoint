"use client";

import { tipThemeVars } from "@waypoint/shared/tip-theme";
import type { PublicTipTheme } from "@waypoint/shared/api-types";
import type * as React from "react";

/**
 * A static copy of the tip visitors see, styled by the same theme function as the real script,
 * so the preview matches the site. Shown on a mock page with the highlighted element.
 */
export function TipPreview({ tip, brand }: { tip: PublicTipTheme; brand: string | null }) {
  const vars = tipThemeVars(tip, brand && /^#[0-9a-fA-F]{6}$/.test(brand) ? brand : null);
  const v = (name: string) => `var(${name})`;
  const total = 4;
  const index = 1;
  return (
    <div
      aria-label="Preview of a tour tip"
      role="img"
      className="relative overflow-hidden rounded-xl border border-border"
      style={{ ...(vars as React.CSSProperties), background: "#f1f3f9", height: 260 }}
    >
      {/* mock page */}
      <div className="absolute inset-x-0 top-0 flex h-10 items-center gap-2 bg-white px-4">
        <span className="h-3 w-16 rounded bg-[#d6d9e8]" />
        <span className="ml-auto h-3 w-10 rounded bg-[#e3e6f1]" />
        <span className="h-3 w-10 rounded bg-[#e3e6f1]" />
      </div>
      <div className="absolute left-4 top-16 h-24 w-40 rounded-lg bg-white" />
      <div className="absolute right-4 top-16 h-24 w-40 rounded-lg bg-white" />
      <div className="absolute inset-0" style={{ background: v("--wp-backdrop") }} />
      {/* highlighted element */}
      <div
        className="absolute left-4 top-[64px] flex h-9 w-44 items-center bg-white px-3 text-xs text-slate-500"
        style={{
          borderRadius: v("--wp-hl-radius"),
          boxShadow: `0 0 0 4px ${v("--wp-primary")}`,
        }}
      >
        Search products…
      </div>
      {/* tip */}
      <div
        className="absolute left-4 top-[118px] w-[290px] p-4 pb-3 shadow-[0_12px_32px_rgba(15,23,42,.25)]"
        style={{
          background: v("--wp-bg"),
          color: v("--wp-fg"),
          borderRadius: v("--wp-radius"),
          font: `13px/1.5 ${v("--wp-font")}`,
        }}
      >
        <div className="flex items-start gap-2">
          <p className="flex-1 text-[15px] font-semibold">Find any product fast</p>
          <span aria-hidden style={{ color: v("--wp-muted") }} className="text-lg leading-none">
            ×
          </span>
        </div>
        <p className="mt-1" style={{ color: v("--wp-body") }}>
          Search by part number, model or brand.
        </p>
        <div className="mt-3 flex items-center gap-2 text-[11px]">
          <span className="flex flex-1 items-center gap-1" style={{ color: v("--wp-muted") }}>
            {tip.progress === "COUNTER" && `${index + 1} of ${total}`}
            {tip.progress === "DOTS" &&
              Array.from({ length: total }, (_, i) => (
                <span
                  key={i}
                  style={{
                    width: i === index ? 14 : 6,
                    height: 6,
                    borderRadius: 3,
                    background:
                      i <= index ? v("--wp-primary-btn, var(--wp-primary)") : v("--wp-track"),
                    opacity: i < index ? 0.45 : 1,
                  }}
                />
              ))}
            {tip.progress === "BAR" && (
              <span
                className="block h-1 w-16 overflow-hidden rounded-sm"
                style={{ background: v("--wp-track") }}
              >
                <span
                  className="block h-full"
                  style={{
                    width: "50%",
                    background: `var(--wp-primary-btn, var(--wp-primary))`,
                  }}
                />
              </span>
            )}
          </span>
          <span
            className="px-2.5 py-1.5 font-medium"
            style={{
              border: `1px solid ${v("--wp-border")}`,
              background: v("--wp-btn-bg"),
              borderRadius: v("--wp-btn-radius"),
            }}
          >
            Back
          </span>
          <span
            className="px-2.5 py-1.5 font-medium"
            style={{
              background: `var(--wp-primary-btn, var(--wp-primary))`,
              color: v("--wp-on-primary"),
              borderRadius: v("--wp-btn-radius"),
            }}
          >
            Next
          </span>
        </div>
      </div>
    </div>
  );
}
