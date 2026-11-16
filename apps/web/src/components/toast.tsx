"use client";

import { CheckCircle2, CircleAlert, X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "success" | "error";
interface Toast {
  id: number;
  tone: Tone;
  title: string;
  body?: string;
}

const ToastContext = React.createContext<(t: Omit<Toast, "id">) => void>(() => {});

/** Short confirmation messages after an action, e.g. "Step saved". Lives in the dashboard layout,
 * so a toast survives the page change that usually follows a save. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const next = React.useRef(1);

  const dismiss = React.useCallback(
    (id: number) => setToasts((all) => all.filter((t) => t.id !== id)),
    [],
  );
  const push = React.useCallback(
    (t: Omit<Toast, "id">) => {
      const id = next.current++;
      setToasts((all) => [...all.slice(-2), { ...t, id }]);
      setTimeout(() => dismiss(id), t.tone === "error" ? 7000 : 3500);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
      >
        <div aria-live="polite" className="contents">
          {toasts.map((t) => (
            <div
              key={t.id}
              role={t.tone === "error" ? "alert" : "status"}
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-xl border bg-card p-3.5 pr-2.5 text-sm shadow-raised motion-safe:animate-[wp-toast-in_.2s_ease-out]",
                t.tone === "error" ? "border-destructive/40" : "border-border",
              )}
            >
              {t.tone === "success" ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success-solid" aria-hidden />
              ) : (
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{t.title}</p>
                {t.body && <p className="mt-0.5 text-xs text-muted-foreground">{t.body}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const push = React.useContext(ToastContext);
  return React.useMemo(
    () => ({
      success: (title: string, body?: string) => push({ tone: "success", title, body }),
      error: (title: string, body?: string) => push({ tone: "error", title, body }),
    }),
    [push],
  );
}
