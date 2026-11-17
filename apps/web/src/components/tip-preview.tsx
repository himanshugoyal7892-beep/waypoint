"use client";

import { tipThemeVars } from "@waypoint/shared/tip-theme";
import type { PublicTipTheme } from "@waypoint/shared/api-types";
import { ChevronLeft, ChevronRight, Monitor, RotateCcw, Smartphone } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

const v = (name: string) => `var(${name})`;
const PRIMARY = "var(--wp-primary-btn, var(--wp-primary))";

export interface TipContent {
  title: string;
  description: string;
  nextButtonLabel: string;
  backButtonLabel: string;
  allowSkip: boolean;
  placement: string;
}

export const DEFAULT_TIP_THEME: PublicTipTheme = {
  style: "LIGHT",
  corners: "ROUNDED",
  progress: "COUNTER",
  font: "SYSTEM",
  backdrop: true,
};

function themeStyle(tip: PublicTipTheme, brand: string | null) {
  return tipThemeVars(
    tip,
    brand && /^#[0-9a-fA-F]{6}$/.test(brand) ? brand : null,
  ) as React.CSSProperties;
}

/**
 * The tip a visitor sees, drawn with the same theme variables and button rules as the real
 * script: Skip only when allowed and not last, Back from step 2, "Finish" on the last step.
 * Must sit inside an element that carries the theme variables.
 */
export function TipCard({
  step,
  index,
  total,
  progress,
  width = 290,
  onNext,
  onBack,
  onClose,
  arrow,
}: {
  step: TipContent;
  index: number;
  total: number;
  progress: PublicTipTheme["progress"];
  width?: number | string;
  onNext?: () => void;
  onBack?: () => void;
  onClose?: () => void;
  arrow?: "top" | "bottom" | "left" | "right";
}) {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const btn = "px-2.5 py-1.5 font-medium leading-none";
  const Tag = onNext ? "button" : "span";
  return (
    <div
      className="relative p-4 pb-3 text-left shadow-[0_12px_32px_rgba(15,23,42,.25)]"
      style={{
        width,
        maxWidth: "100%",
        background: v("--wp-bg"),
        color: v("--wp-fg"),
        borderRadius: v("--wp-radius"),
        font: `13px/1.5 ${v("--wp-font")}`,
      }}
    >
      {arrow && (
        <span
          aria-hidden
          className={cn(
            "absolute size-3 rotate-45",
            arrow === "top" && "-top-1.5 left-6",
            arrow === "bottom" && "-bottom-1.5 left-6",
            arrow === "left" && "top-5 -left-1.5",
            arrow === "right" && "top-5 -right-1.5",
          )}
          style={{ background: v("--wp-bg") }}
        />
      )}
      <div className="flex items-start gap-2">
        <p dir="auto" className="flex-1 text-[15px] leading-snug font-semibold break-words">
          {step.title || `Step ${index + 1}`}
        </p>
        <Tag
          {...(onClose ? { type: "button" as const, onClick: onClose, "aria-label": "Close" } : {})}
          aria-hidden={onClose ? undefined : true}
          style={{ color: v("--wp-muted") }}
          className="text-lg leading-none"
        >
          ×
        </Tag>
      </div>
      {step.description && (
        <p
          dir="auto"
          className="mt-1 break-words whitespace-pre-line"
          style={{ color: v("--wp-body") }}
        >
          {step.description}
        </p>
      )}
      <div className="mt-3 flex items-center gap-2 text-[11px]">
        <span
          className="flex flex-1 items-center gap-1 whitespace-nowrap"
          style={{ color: v("--wp-muted") }}
        >
          {progress === "COUNTER" && `${index + 1} of ${total}`}
          {progress === "DOTS" &&
            Array.from({ length: Math.min(total, 12) }, (_, i) => (
              <span
                key={i}
                style={{
                  width: i === index ? 14 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: i <= index ? PRIMARY : v("--wp-track"),
                  opacity: i < index ? 0.45 : 1,
                  transition: "width .2s",
                }}
              />
            ))}
          {progress === "BAR" && (
            <span
              className="block h-1 w-16 overflow-hidden rounded-sm"
              style={{ background: v("--wp-track") }}
            >
              <span
                className="block h-full transition-[width]"
                style={{ width: `${((index + 1) / total) * 100}%`, background: PRIMARY }}
              />
            </span>
          )}
        </span>
        {step.allowSkip && !isLast && (
          <Tag
            {...(onClose ? { type: "button" as const, onClick: onClose } : {})}
            className={btn}
            style={{ color: v("--wp-muted") }}
          >
            Skip
          </Tag>
        )}
        {!isFirst && (
          <Tag
            {...(onBack ? { type: "button" as const, onClick: onBack } : {})}
            className={btn}
            style={{
              border: `1px solid ${v("--wp-border")}`,
              background: v("--wp-btn-bg"),
              borderRadius: v("--wp-btn-radius"),
            }}
          >
            {step.backButtonLabel || "Back"}
          </Tag>
        )}
        <Tag
          {...(onNext ? { type: "button" as const, onClick: onNext } : {})}
          className={btn}
          style={{
            background: PRIMARY,
            color: v("--wp-on-primary"),
            borderRadius: v("--wp-btn-radius"),
          }}
        >
          {isLast ? "Finish" : step.nextButtonLabel || "Next"}
        </Tag>
      </div>
    </div>
  );
}

/** Settings preview: a fixed sample tip on a mock page. */
export function TipPreview({ tip, brand }: { tip: PublicTipTheme; brand: string | null }) {
  return (
    <MockScreen
      tip={tip}
      brand={brand}
      device="desktop"
      index={1}
      total={4}
      height={260}
      step={{
        title: "Find any product fast",
        description: "Search by part number, model or brand.",
        nextButtonLabel: "Next",
        backButtonLabel: "Back",
        allowSkip: false,
        placement: "BOTTOM",
      }}
    />
  );
}

/**
 * A small page mock-up with one highlighted element and the tip placed next to it, as on the
 * live site. Phones show tips below or above the element, as the real script does when there is
 * no room beside it.
 */
export function MockScreen({
  tip,
  brand,
  step,
  index,
  total,
  device,
  height = 300,
  address,
  onNext,
  onBack,
  onClose,
}: {
  tip: PublicTipTheme;
  brand: string | null;
  step: TipContent;
  index: number;
  total: number;
  device: "desktop" | "phone";
  height?: number;
  address?: string;
  onNext?: () => void;
  onBack?: () => void;
  onClose?: () => void;
}) {
  const phone = device === "phone";
  let place = (step.placement || "AUTO").toUpperCase();
  if (place === "AUTO" || (phone && (place === "LEFT" || place === "RIGHT"))) place = "BOTTOM";

  // Element position inside the screen, chosen so the tip has room on its side.
  const el =
    place === "TOP"
      ? { top: "64%", left: phone ? "8%" : "30%", width: phone ? "84%" : "40%" }
      : place === "LEFT"
        ? { top: "34%", left: "68%", width: "28%" }
        : place === "RIGHT"
          ? { top: "34%", left: "4%", width: "28%" }
          : { top: "20%", left: phone ? "8%" : "8%", width: phone ? "84%" : "40%" };
  const tipPos: React.CSSProperties =
    place === "TOP"
      ? { bottom: "calc(36% + 52px)", left: el.left }
      : place === "LEFT"
        ? { top: "calc(34% - 8px)", left: "4%", right: "calc(32% + 12px)" }
        : place === "RIGHT"
          ? { top: "calc(34% - 8px)", left: "calc(32% + 12px)", right: "4%" }
          : { top: "calc(20% + 52px)", left: el.left };
  const side = place === "LEFT" || place === "RIGHT";
  const arrow = ({ TOP: "bottom", BOTTOM: "top", LEFT: "right", RIGHT: "left" } as const)[
    place as "TOP"
  ];

  return (
    <div
      role="img"
      aria-label={`Preview of step ${index + 1} of ${total} on a ${phone ? "phone" : "desktop"} screen: ${step.title || step.description}`}
      className={cn(
        "relative mx-auto overflow-hidden border border-border bg-[#f1f3f9] transition-[width] duration-300",
        phone ? "w-[260px] rounded-[28px] border-[6px] border-ink" : "w-full rounded-xl",
      )}
      style={{ ...themeStyle(tip, brand), height }}
    >
      {/* browser bar / phone notch */}
      {phone ? (
        <div className="absolute inset-x-0 top-0 z-10 flex h-6 items-center justify-center bg-white">
          <span className="h-1.5 w-14 rounded-full bg-[#d6d9e8]" />
        </div>
      ) : (
        <div className="absolute inset-x-0 top-0 z-10 flex h-8 items-center gap-1.5 border-b border-[#e3e6f1] bg-white px-3">
          <span className="size-2 rounded-full bg-[#f3a3a3]" />
          <span className="size-2 rounded-full bg-[#f3d38a]" />
          <span className="size-2 rounded-full bg-[#a6dcb4]" />
          <span className="ml-2 min-w-0 flex-1 truncate rounded-md bg-[#f1f3f9] px-2 py-0.5 font-mono text-[10px] text-slate-500">
            {address ?? "yoursite.com"}
          </span>
        </div>
      )}
      {/* page wireframe */}
      <div className="absolute inset-x-0 top-0" style={{ paddingTop: phone ? 24 : 32 }}>
        <div className="flex h-9 items-center gap-2 bg-white px-3">
          <span className="h-3 w-14 rounded bg-[#d6d9e8]" />
          {!phone && <span className="ml-auto h-2.5 w-10 rounded bg-[#e3e6f1]" />}
          <span className={cn("h-2.5 w-10 rounded bg-[#e3e6f1]", phone && "ml-auto")} />
        </div>
        <div className={cn("grid gap-2 p-3", phone ? "grid-cols-1" : "grid-cols-3")}>
          {Array.from({ length: phone ? 4 : 6 }, (_, i) => (
            <div key={i} className="h-16 rounded-lg bg-white" />
          ))}
        </div>
      </div>
      {tip.backdrop && (
        <div className="absolute inset-0" style={{ background: v("--wp-backdrop") }} />
      )}
      {/* highlighted element */}
      <div
        className="absolute flex h-10 items-center bg-white px-3 text-[11px] text-slate-400 transition-all duration-300"
        style={{
          ...el,
          borderRadius: v("--wp-hl-radius"),
          boxShadow: `0 0 0 3px ${v("--wp-primary")}`,
        }}
      >
        <span className="h-2 w-2/3 rounded bg-[#e3e6f1]" />
      </div>
      <div
        className="absolute transition-all duration-300"
        style={{
          ...tipPos,
          maxWidth: side ? undefined : phone ? "84%" : "60%",
          display: "flex",
          justifyContent: place === "LEFT" ? "flex-end" : "flex-start",
        }}
      >
        <TipCard
          step={step}
          index={index}
          total={total}
          progress={tip.progress}
          width={side ? 270 : phone ? 218 : 270}
          arrow={arrow}
          onNext={onNext}
          onBack={onBack}
          onClose={onClose}
        />
      </div>
    </div>
  );
}

/**
 * Plays a whole tour on a small screen in the dashboard: step through with the tip's own buttons
 * or the controls below, and switch between desktop and phone.
 */
export function TourPlayer({
  steps,
  tip,
  brand,
  origin,
  onStepChange,
  initialIndex = 0,
}: {
  steps: (TipContent & { pageUrl: string })[];
  tip: PublicTipTheme;
  brand: string | null;
  origin: string;
  onStepChange?: (index: number) => void;
  initialIndex?: number;
}) {
  const [i, setI] = React.useState(Math.min(initialIndex, Math.max(0, steps.length - 1)));
  const [device, setDevice] = React.useState<"desktop" | "phone">("desktop");
  const [finished, setFinished] = React.useState(false);
  const total = steps.length;
  const go = (n: number) => {
    const next = Math.max(0, Math.min(total - 1, n));
    setI(next);
    setFinished(false);
    onStepChange?.(next);
  };
  React.useEffect(() => {
    if (i > total - 1) setI(Math.max(0, total - 1));
  }, [i, total]);
  const step = steps[i];
  if (!step) return null;
  const host = origin.replace(/^https?:\/\//, "");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div
          role="radiogroup"
          aria-label="Screen size"
          className="inline-flex rounded-lg border border-border bg-background p-0.5"
        >
          {(
            [
              ["desktop", "Desktop", Monitor],
              ["phone", "Phone", Smartphone],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={device === key}
              onClick={() => setDevice(key)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                device === key
                  ? "bg-primary-soft text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
          Step {i + 1} of {total}
        </span>
      </div>

      <div className="relative">
        <MockScreen
          tip={tip}
          brand={brand}
          step={step}
          index={i}
          total={total}
          device={device}
          height={device === "phone" ? 440 : 300}
          address={`${host}${step.pageUrl}`}
          onNext={() => (i === total - 1 ? setFinished(true) : go(i + 1))}
          onBack={() => go(i - 1)}
          onClose={() => setFinished(true)}
        />
        {finished && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-card/90 text-center backdrop-blur-sm">
            <p className="text-sm font-medium">
              {i === total - 1 ? "Tour finished" : "Visitor closed the tour"}
            </p>
            <button
              type="button"
              onClick={() => go(0)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              <RotateCcw className="size-3.5" aria-hidden /> Play again
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => go(i - 1)}
          disabled={i === 0}
          aria-label="Previous step"
          className="rounded-lg border border-border p-1.5 hover:bg-muted disabled:opacity-40"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <div className="flex flex-1 items-center gap-1" aria-hidden>
          {steps.map((_, n) => (
            <button
              key={n}
              type="button"
              tabIndex={-1}
              onClick={() => go(n)}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                n === i ? "bg-primary" : n < i ? "bg-primary/40" : "bg-chart-track",
              )}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => go(i + 1)}
          disabled={i === total - 1}
          aria-label="Next step"
          className="rounded-lg border border-border p-1.5 hover:bg-muted disabled:opacity-40"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Page: <span className="font-mono break-all">{step.pageUrl}</span>
      </p>
    </div>
  );
}
