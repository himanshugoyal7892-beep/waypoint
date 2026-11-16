/**
 * Launch checklist for a project: the steps from "new project" to "a visitor finished a tour".
 * Pure: the caller supplies the facts.
 */

export interface ChecklistFacts {
  projectBase: string;
  hasRealOrigin: boolean;
  snippetSeen: boolean;
  /** Id of a tour with 3+ steps, if any. */
  tourWithSteps: string | null;
  anyPublished: boolean;
  identityConfigured: boolean;
  /** Id of a targeted tour, if any; else the tour to suggest targeting on. */
  targetedTour: string | null;
  suggestTargetTour: string | null;
  themeColorSet: boolean;
  anyCompletion: boolean;
}

export interface ChecklistItem {
  key: string;
  label: string;
  hint: string;
  done: boolean;
  href: string;
}

export interface Checklist {
  items: ChecklistItem[];
  done: number;
  total: number;
  /** 0–1 */
  progress: number;
  level: { name: string; description: string };
  next: ChecklistItem | null;
}

const LEVELS = [
  {
    min: 1,
    name: "Launch ready",
    description: "Everything is set up. Keep an eye on tour health.",
  },
  { min: 0.75, name: "Almost there", description: "A couple of finishing touches left." },
  { min: 0.4, name: "Taking shape", description: "Your first tour is coming together." },
  { min: 0, name: "Getting started", description: "Follow the next step below." },
] as const;

export function buildChecklist(f: ChecklistFacts): Checklist {
  const b = f.projectBase;
  const items: ChecklistItem[] = [
    {
      key: "origin",
      label: "Add your website",
      hint: "Tell Waypoint which website address may load tours.",
      done: f.hasRealOrigin,
      href: `${b}/settings#allowedOrigins`,
    },
    {
      key: "install",
      label: "Install the snippet",
      hint: "Paste it in your site or Google Tag Manager. Done when the first visit arrives.",
      done: f.snippetSeen,
      href: `${b}/install`,
    },
    {
      key: "build",
      label: "Build a tour with 3+ steps",
      hint: "Click elements on your site with the visual builder.",
      done: f.tourWithSteps !== null,
      href: f.tourWithSteps ? `${b}/tours/${f.tourWithSteps}` : `${b}/tours/new`,
    },
    {
      key: "publish",
      label: "Publish a tour",
      hint: "Published tours start showing to visitors.",
      done: f.anyPublished,
      href: `${b}/tours?status=DRAFT`,
    },
    {
      key: "identity",
      label: "Recognise logged-in users",
      hint: "One setting, no site code. Unlocks new/returning and logged-in targeting.",
      done: f.identityConfigured,
      href: `${b}/settings#identity`,
    },
    {
      key: "target",
      label: "Aim a tour at the right people",
      hint: "Pick an audience, device or login state for a tour.",
      done: f.targetedTour !== null,
      href:
        f.targetedTour || f.suggestTargetTour
          ? `${b}/tours/${f.targetedTour ?? f.suggestTargetTour}?tab=who`
          : `${b}/tours`,
    },
    {
      key: "brand",
      label: "Match your brand colour",
      hint: "Tour buttons and highlights in your colour.",
      done: f.themeColorSet,
      href: `${b}/settings#display`,
    },
    {
      key: "complete",
      label: "First visitor finishes a tour",
      hint: "The real goal. Watch it happen in Analytics.",
      done: f.anyCompletion,
      href: `${b}/analytics`,
    },
  ];
  const done = items.filter((i) => i.done).length;
  const progress = done / items.length;
  const level = LEVELS.find((l) => progress >= l.min)!;
  return {
    items,
    done,
    total: items.length,
    progress,
    level: { name: level.name, description: level.description },
    next: items.find((i) => !i.done) ?? null,
  };
}
