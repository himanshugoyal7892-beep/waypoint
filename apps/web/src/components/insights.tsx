import { ArrowRight, Check, Lightbulb } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Checklist } from "@/server/insights/checklist";
import type { HealthGrade, HealthResult } from "@/server/insights/health";

/* ---------- Progress ring: a route around a circle, with the amber pin at the current point ---------- */

export function ProgressRing({
  value,
  size = 96,
  stroke = 9,
  label,
  sublabel,
  tone = "#4a44d6",
}: {
  /** 0–1 */
  value: number;
  size?: number;
  stroke?: number;
  label: React.ReactNode;
  sublabel?: React.ReactNode;
  tone?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  const angle = v * 2 * Math.PI - Math.PI / 2;
  const px = size / 2 + r * Math.cos(angle);
  const py = size / 2 + r * Math.sin(angle);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#e1e4f2"
          strokeWidth={stroke}
          strokeDasharray="2 5"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * v} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="motion-safe:transition-[stroke-dasharray] motion-safe:duration-700"
        />
        {v > 0 && v < 1 && (
          <circle cx={px} cy={py} r={stroke / 2 + 2} fill="#f5a524" stroke="#fff" strokeWidth={2} />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display text-xl font-semibold leading-none tabular-nums">
          {label}
        </span>
        {sublabel && <span className="mt-1 text-[11px] text-muted-foreground">{sublabel}</span>}
      </div>
    </div>
  );
}

/* ---------- Health grade ---------- */

const GRADE_STYLE: Record<HealthGrade, { chip: string; text: string; ring: string; word: string }> =
  {
    A: { chip: "bg-[#1d7a4b] text-white", text: "text-[#1d7a4b]", ring: "#1d9a5b", word: "Great" },
    B: { chip: "bg-primary text-white", text: "text-primary", ring: "#4a44d6", word: "Good" },
    C: { chip: "bg-pin text-ink", text: "text-[#a35f00]", ring: "#f5a524", word: "Needs work" },
    D: {
      chip: "bg-[#c62828] text-white",
      text: "text-[#c62828]",
      ring: "#c62828",
      word: "At risk",
    },
  };

export function HealthBadge({
  health,
  size = "md",
}: {
  health: Pick<HealthResult, "score" | "grade" | "provisional">;
  size?: "sm" | "md";
}) {
  const s = GRADE_STYLE[health.grade];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border bg-white pr-2.5 font-medium tabular-nums",
        health.provisional ? "border-dashed border-[#c9cceb]" : "border-border",
        size === "sm" ? "text-xs" : "text-sm",
      )}
      title={`Health ${health.score}/100, grade ${health.grade}${health.provisional ? " (provisional: not enough visits yet)" : ""}`}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-full font-display font-bold",
          s.chip,
          size === "sm" ? "size-5 text-[11px]" : "size-6 text-xs",
        )}
      >
        {health.grade}
      </span>
      {health.score}
      {health.provisional && <span className="text-muted-foreground">*</span>}
      <span className="sr-only"> out of 100{health.provisional ? ", provisional" : ""}</span>
    </span>
  );
}

/** Each bar shows its own standing: full marks green, decent indigo, weak amber, poor red. */
function partColour(ratio: number) {
  if (ratio >= 0.85) return "#1d9a5b";
  if (ratio >= 0.6) return "#4a44d6";
  if (ratio >= 0.3) return "#f5a524";
  return "#c62828";
}

export function HealthPanel({
  health,
  compact = false,
}: {
  health: HealthResult;
  compact?: boolean;
}) {
  const s = GRADE_STYLE[health.grade];
  const tips = compact ? health.tips.slice(0, 2) : health.tips;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <ProgressRing
          value={health.score / 100}
          size={84}
          stroke={8}
          tone={s.ring}
          label={health.score}
          sublabel="of 100"
        />
        <div>
          <p className={cn("font-display text-2xl font-semibold", s.text)}>
            Grade {health.grade} · {s.word}
          </p>
          <p className="text-xs text-muted-foreground">
            {health.provisional
              ? "Provisional: some parts wait for more visits."
              : "Based on the last 30 days."}
          </p>
        </div>
      </div>
      <ul className="space-y-2.5">
        {health.parts.map((p) => (
          <li key={p.key}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium">{p.label}</span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {p.pending ? "waiting" : `${Math.round(p.points)}/${p.max}`}
              </span>
            </div>
            <div
              className={cn(
                "mt-1 h-2 overflow-hidden rounded-full",
                p.pending
                  ? "bg-[repeating-linear-gradient(90deg,#e1e4f2_0_6px,transparent_6px_10px)]"
                  : "bg-muted",
              )}
            >
              {!p.pending && (
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(p.points / p.max) * 100}%`,
                    background: partColour(p.points / p.max),
                  }}
                />
              )}
            </div>
            {!compact && <p className="mt-1 text-xs text-muted-foreground">{p.detail}</p>}
          </li>
        ))}
      </ul>
      {tips.length > 0 && (
        <div className="rounded-lg bg-[#fff8eb] p-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#8a5300]">
            <Lightbulb className="size-3.5" aria-hidden /> To raise the score
          </p>
          <ul className="space-y-1.5 text-sm">
            {tips.map((t) => (
              <li key={t} className="flex gap-2">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-pin" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ---------- Launch checklist: drawn as a route with stops ---------- */

export function ChecklistCard({
  checklist,
  title = "Launch checklist",
}: {
  checklist: Checklist;
  title?: string;
}) {
  const { items, done, total, progress, level, next } = checklist;
  return (
    <section
      aria-labelledby="checklist-title"
      className="rounded-xl border border-border bg-white p-5 shadow-[0_1px_2px_rgb(27_31_75/0.05)]"
    >
      <div className="flex items-center gap-5">
        <ProgressRing value={progress} label={`${done}/${total}`} sublabel="done" />
        <div className="min-w-0">
          <h2 id="checklist-title" className="text-sm font-medium text-muted-foreground">
            {title}
          </h2>
          <p className="font-display text-2xl font-semibold">{level.name}</p>
          <p className="text-sm text-muted-foreground">{level.description}</p>
          {next && (
            <Link
              href={next.href}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-sm font-medium text-white hover:bg-ink/90 focus-visible:outline-2"
            >
              Next: {next.label} <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          )}
        </div>
      </div>
      <ol className="mt-5 grid gap-x-6 sm:grid-cols-2">
        {items.map((it) => {
          const isNext = next?.key === it.key;
          return (
            <li key={it.key}>
              <Link
                href={it.href}
                className={cn(
                  "-mx-2 flex gap-3 rounded-lg px-2 py-2 hover:bg-muted/60 focus-visible:outline-2",
                  isNext && "bg-[#fff8eb] hover:bg-[#fff2d9]",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                    it.done
                      ? "border-primary bg-primary text-white"
                      : isNext
                        ? "border-pin bg-pin"
                        : "border-[#c9cceb] bg-white",
                  )}
                >
                  {it.done && <Check className="size-3" strokeWidth={3} />}
                  {isNext && <span className="size-1.5 rounded-full bg-ink" />}
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block text-sm font-medium",
                      it.done && "text-muted-foreground line-through decoration-[#c9cceb]",
                    )}
                  >
                    {it.label}
                    <span className="sr-only">{it.done ? " (done)" : isNext ? " (next)" : ""}</span>
                  </span>
                  {!it.done && (
                    <span className="block text-xs text-muted-foreground">{it.hint}</span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
