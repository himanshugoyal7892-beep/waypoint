import type { Audience, Frequency } from "./enums";

/**
 * Pure targeting rules: who sees an automatic tour, and how often. Used by the server to decide
 * eligibility per visit, and by the dashboard to validate the form. No I/O here.
 */

export const TARGETING_LIMITS = { days: 365, maxShows: 20 } as const;
export const DEFAULT_MAX_SHOWS = 3;

/** A new visit starts after this much inactivity (matches the SDK's session rotation). */
export const VISIT_GAP_MS = 30 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface TourRules {
  audience: Audience;
  audienceDays: number | null;
  audienceBefore: Date | null;
  frequency: Frequency;
  maxShows: number | null;
  intervalDays: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
}

export interface VisitorFacts {
  firstSeenAt: Date;
  lastSeenAt: Date;
  visitStartedAt: Date;
  previousVisitAt: Date | null;
  /** Provided by the site via ProductTour.identify(); more accurate than firstSeenAt. */
  signedUpAt: Date | null;
}

export interface TourHistory {
  shows: number;
  lastShownAt: Date | null;
  completedAt: Date | null;
  skippedAt: Date | null;
}

/** Advances a visitor profile for a request at `now`. A gap > VISIT_GAP_MS starts a new visit. */
export function nextVisit(prev: VisitorFacts | null, now: Date): VisitorFacts {
  if (!prev)
    return {
      firstSeenAt: now,
      lastSeenAt: now,
      visitStartedAt: now,
      previousVisitAt: null,
      signedUpAt: null,
    };
  const newVisit = now.getTime() - prev.lastSeenAt.getTime() > VISIT_GAP_MS;
  return {
    ...prev,
    lastSeenAt: now,
    visitStartedAt: newVisit ? now : prev.visitStartedAt,
    previousVisitAt: newVisit ? prev.lastSeenAt : prev.previousVisitAt,
  };
}

/** Whether `now` falls inside the tour's date window (whole UTC days, both ends inclusive). */
export function inDateWindow(rules: Pick<TourRules, "startsAt" | "endsAt">, now: Date): boolean {
  if (rules.startsAt && now.getTime() < rules.startsAt.getTime()) return false;
  if (rules.endsAt && now.getTime() >= rules.endsAt.getTime() + DAY_MS) return false;
  return true;
}

export function matchesAudience(rules: TourRules, v: VisitorFacts, now: Date): boolean {
  const joined = v.signedUpAt ?? v.firstSeenAt;
  switch (rules.audience) {
    case "ALL":
      return true;
    case "NEW_USERS":
      return now.getTime() - joined.getTime() <= (rules.audienceDays ?? 0) * DAY_MS;
    case "DORMANT_USERS":
      return (
        v.previousVisitAt !== null &&
        v.visitStartedAt.getTime() - v.previousVisitAt.getTime() >=
          (rules.audienceDays ?? Infinity) * DAY_MS
      );
    case "EXISTING_USERS":
      return rules.audienceBefore !== null && joined.getTime() < rules.audienceBefore.getTime();
  }
}

export function allowedByFrequency(
  rules: TourRules,
  h: TourHistory | null,
  v: VisitorFacts,
  now: Date,
): boolean {
  const shows = h?.shows ?? 0;
  const max = rules.maxShows ?? DEFAULT_MAX_SHOWS;
  switch (rules.frequency) {
    case "ONCE":
      return shows === 0 && !h?.completedAt && !h?.skippedAt;
    case "UNTIL_COMPLETED":
      // At most once per visit, until finished or shown `max` times.
      return (
        !h?.completedAt &&
        shows < max &&
        !(h?.lastShownAt && h.lastShownAt.getTime() >= v.visitStartedAt.getTime())
      );
    case "INTERVAL":
      return (
        !h?.completedAt &&
        shows < max &&
        (!h?.lastShownAt ||
          now.getTime() - h.lastShownAt.getTime() >= (rules.intervalDays ?? Infinity) * DAY_MS)
      );
  }
}

/** Should this automatic tour be offered to this visitor in this visit? */
export function isTourEligible(
  rules: TourRules,
  visitor: VisitorFacts,
  history: TourHistory | null,
  now: Date,
): boolean {
  return (
    inDateWindow(rules, now) &&
    matchesAudience(rules, visitor, now) &&
    allowedByFrequency(rules, history, visitor, now)
  );
}

export interface TargetingIssue {
  path: string;
  message: string;
}

/** Cross-field checks for a complete set of rules (create, or existing tour merged with a patch). */
export function targetingIssues(r: TourRules): TargetingIssue[] {
  const issues: TargetingIssue[] = [];
  if ((r.audience === "NEW_USERS" || r.audience === "DORMANT_USERS") && !r.audienceDays)
    issues.push({ path: "audienceDays", message: "Enter a number of days." });
  if (r.audience === "EXISTING_USERS" && !r.audienceBefore)
    issues.push({ path: "audienceBefore", message: "Choose the date the feature launched." });
  if (r.frequency === "INTERVAL" && !r.intervalDays)
    issues.push({ path: "intervalDays", message: "Enter how many days between showings." });
  if (r.startsAt && r.endsAt && r.endsAt.getTime() < r.startsAt.getTime())
    issues.push({ path: "endsAt", message: "End date must be on or after the start date." });
  return issues;
}
