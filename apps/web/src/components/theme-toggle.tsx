"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

type Pref = "system" | "light" | "dark";
const KEY = "wp-theme";

function apply(pref: Pref) {
  const dark =
    pref === "dark" ||
    (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

const OPTIONS: { value: Pref; label: string; Icon: typeof Sun }[] = [
  { value: "system", label: "Match computer", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

/** Light / dark / follow-the-computer, saved in this browser. */
export function ThemeToggle({ className }: { className?: string }) {
  const [pref, setPref] = React.useState<Pref>("system");

  React.useEffect(() => {
    let saved: Pref = "system";
    try {
      const v = localStorage.getItem(KEY);
      if (v === "light" || v === "dark") saved = v;
    } catch {
      /* storage blocked */
    }
    setPref(saved);
  }, []);

  React.useEffect(() => {
    if (pref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  const choose = (p: Pref) => {
    setPref(p);
    try {
      localStorage.setItem(KEY, p);
    } catch {
      /* storage blocked: applies for this page only */
    }
    apply(p);
  };

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn("inline-flex rounded-lg bg-white/5 p-0.5 ring-1 ring-white/10", className)}
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={pref === value}
          aria-label={label}
          title={label}
          onClick={() => choose(value)}
          className={cn(
            "flex size-7 items-center justify-center rounded-md text-ink-muted outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white/60",
            pref === value && "bg-white/15 text-white",
          )}
        >
          <Icon className="size-3.5" aria-hidden />
        </button>
      ))}
    </div>
  );
}
