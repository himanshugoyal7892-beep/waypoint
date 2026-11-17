/**
 * Tour health score: 0–100 with a letter grade and concrete tips. Pure: no I/O.
 *
 * Parts (max points):
 *   completion 35 – share of starts that finish (full marks at 60%+). Needs ≥ 5 starts.
 *   reliability 25 – steps whose element was found (zero marks at 20% missing). Needs ≥ 5 step loads.
 *   length 15     – 3–7 steps is the sweet spot.
 *   copy 15       – every step has a short title and a description under 160 characters.
 *   setup 10      – published, and aimed at someone (targeting, priority, or started by link).
 * Parts without enough data are left out and the score is scaled to the rest ("provisional").
 */

export const HEALTH_MIN_STARTS = 5;
const COMPLETION_TARGET = 0.6;
const MISSING_CEILING = 0.2;
const TITLE_MAX = 60;
const DESCRIPTION_MAX = 160;

export interface HealthStep {
  stepOrder: number;
  title: string;
  description: string;
}

export interface HealthInput {
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  /** Started by link/button, or has any targeting beyond the defaults. */
  aimed: boolean;
  steps: HealthStep[];
  started: number;
  completed: number;
  /** step_viewed counts by step order. */
  viewedByStep: Record<number, number>;
  /** element_not_found counts by step order. */
  missingByStep: Record<number, number>;
}

export type HealthGrade = "A" | "B" | "C" | "D";

export interface HealthPart {
  key: "completion" | "reliability" | "length" | "copy" | "setup";
  label: string;
  points: number;
  max: number;
  /** Not enough data yet: excluded from the score. */
  pending: boolean;
  detail: string;
}

export interface HealthResult {
  score: number;
  grade: HealthGrade;
  provisional: boolean;
  parts: HealthPart[];
  /** Most valuable first. */
  tips: string[];
  /** The biggest drop between consecutive steps, when completion is below target. */
  dropOff: { fromOrder: number; toOrder: number; lost: number } | null;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

export function gradeFor(score: number): HealthGrade {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  return "D";
}

function lengthPoints(n: number): number {
  if (n >= 3 && n <= 7) return 15;
  if (n >= 8 && n <= 10) return 11;
  if (n === 2) return 9;
  if (n > 10) return 7;
  if (n === 1) return 5;
  return 0;
}

export function computeTourHealth(input: HealthInput): HealthResult {
  const tips: { weight: number; text: string }[] = [];
  let dropOff: HealthResult["dropOff"] = null;
  const steps = [...input.steps].sort((a, b) => a.stepOrder - b.stepOrder);
  const label = (order: number) => {
    const s = steps.find((x) => x.stepOrder === order);
    return s?.title ? `step ${order} (“${s.title}”)` : `step ${order}`;
  };

  // Completion
  const rate = input.started ? input.completed / input.started : 0;
  const completionPending = input.started < HEALTH_MIN_STARTS;
  const completionPts = completionPending ? 0 : Math.min(1, rate / COMPLETION_TARGET) * 35;
  if (completionPending) {
    tips.push({
      weight: 1,
      text: `The score firms up after ${HEALTH_MIN_STARTS} starts (${input.started} so far). Share the tour link to get there faster.`,
    });
  } else if (rate < COMPLETION_TARGET) {
    // Biggest drop between consecutive steps.
    let worst: { order: number; from: number; lost: number } | null = null;
    for (let i = 1; i < steps.length; i++) {
      const prev = input.viewedByStep[steps[i - 1]!.stepOrder] ?? 0;
      const cur = input.viewedByStep[steps[i]!.stepOrder] ?? 0;
      const lost = prev - cur;
      if (lost > 0 && (!worst || lost > worst.lost))
        worst = { order: steps[i]!.stepOrder, from: steps[i - 1]!.stepOrder, lost };
    }
    if (worst) dropOff = { fromOrder: worst.from, toOrder: worst.order, lost: worst.lost };
    tips.push({
      weight: 35 - completionPts,
      text: worst
        ? `${pct(rate)} of visitors finish. Most leave before ${label(worst.order)}: make it shorter or more useful.`
        : `${pct(rate)} of visitors finish. Try a shorter tour or a more inviting first step.`,
    });
  }

  // Reliability
  const viewed = Object.values(input.viewedByStep).reduce((a, b) => a + b, 0);
  const missing = Object.values(input.missingByStep).reduce((a, b) => a + b, 0);
  const loads = viewed + missing;
  const reliabilityPending = loads < HEALTH_MIN_STARTS;
  const missingRate = loads ? missing / loads : 0;
  const reliabilityPts = reliabilityPending
    ? 0
    : Math.max(0, 1 - missingRate / MISSING_CEILING) * 25;
  if (!reliabilityPending && missing > 0) {
    const worstOrder = Object.entries(input.missingByStep).sort((a, b) => b[1] - a[1])[0]?.[0];
    tips.push({
      weight: 25 - reliabilityPts + 5,
      text: `${label(Number(worstOrder))} couldn’t find its element ${input.missingByStep[Number(worstOrder)]} time(s). Re-pick it with the visual builder, or raise “Wait for elements”.`,
    });
  }

  // Length
  const lengthPts = lengthPoints(steps.length);
  if (steps.length === 0) tips.push({ weight: 30, text: "Add steps: a tour needs at least one." });
  else if (steps.length > 7)
    tips.push({
      weight: 15 - lengthPts,
      text: `${steps.length} steps is long. Tours of 3–7 steps get finished more; consider splitting it.`,
    });
  else if (steps.length < 3)
    tips.push({ weight: 15 - lengthPts, text: "Add a step or two: 3–7 steps works best." });

  // Copy
  let copyScore = 0;
  const noDescription: number[] = [];
  const tooLong: number[] = [];
  for (const s of steps) {
    const hasTitle = s.title.trim().length > 0 && s.title.length <= TITLE_MAX;
    const hasDesc = s.description.trim().length > 0;
    const shortDesc = s.description.length <= DESCRIPTION_MAX;
    if (!hasDesc) noDescription.push(s.stepOrder);
    if (!shortDesc) tooLong.push(s.stepOrder);
    copyScore += (hasTitle ? 0.4 : 0) + (hasDesc ? 0.4 : 0) + (shortDesc ? 0.2 : 0);
  }
  const copyPts = steps.length ? (copyScore / steps.length) * 15 : 0;
  if (noDescription.length)
    tips.push({
      weight: 6,
      text: `Add a one-line description to step ${noDescription.join(", ")}.`,
    });
  if (tooLong.length)
    tips.push({
      weight: 5,
      text: `Shorten the text of step ${tooLong.join(", ")} to under ${DESCRIPTION_MAX} characters.`,
    });

  // Setup
  const published = input.status === "PUBLISHED";
  const setupPts = (published ? 5 : 0) + (input.aimed ? 5 : 0);
  if (!published) tips.push({ weight: 12, text: "Publish the tour so visitors can see it." });
  if (!input.aimed)
    tips.push({
      weight: 4,
      text: "Choose who should see it in “Who & when”: new visitors, logged-in users, a device…",
    });

  const parts: HealthPart[] = [
    {
      key: "completion",
      label: "Completion",
      points: completionPts,
      max: 35,
      pending: completionPending,
      detail: completionPending
        ? `${input.started} of ${HEALTH_MIN_STARTS} starts needed`
        : `${pct(rate)} finish (${input.completed} of ${input.started})`,
    },
    {
      key: "reliability",
      label: "Reliability",
      points: reliabilityPts,
      max: 25,
      pending: reliabilityPending,
      detail: reliabilityPending
        ? "Waiting for visits"
        : missing
          ? `${pct(missingRate)} of step loads missed their element`
          : "Every element found",
    },
    {
      key: "length",
      label: "Length",
      points: lengthPts,
      max: 15,
      pending: false,
      detail: `${steps.length} step${steps.length === 1 ? "" : "s"}`,
    },
    {
      key: "copy",
      label: "Clear copy",
      points: copyPts,
      max: 15,
      pending: false,
      detail:
        noDescription.length || tooLong.length
          ? `${noDescription.length + tooLong.length} step(s) to tidy`
          : "Titles and descriptions look good",
    },
    {
      key: "setup",
      label: "Setup",
      points: setupPts,
      max: 10,
      pending: false,
      detail: `${published ? "Published" : "Not published"} · ${input.aimed ? "targeted" : "shown to everyone"}`,
    },
  ];

  const counted = parts.filter((p) => !p.pending);
  const got = counted.reduce((n, p) => n + p.points, 0);
  const max = counted.reduce((n, p) => n + p.max, 0);
  const score = max ? Math.round((got / max) * 100) : 0;
  return {
    score,
    grade: gradeFor(score),
    provisional: counted.length < parts.length,
    parts: parts.map((p) => ({ ...p, points: Math.round(p.points * 10) / 10 })),
    tips: tips.sort((a, b) => b.weight - a.weight).map((t) => t.text),
    dropOff,
  };
}
