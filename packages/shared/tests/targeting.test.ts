import { describe, expect, it } from "vitest";
import { createTourSchema, updateTourSchema } from "../src/schemas/tour";
import { identitySchema } from "../src/schemas/project";
import { visitRequestSchema } from "../src/schemas/events";
import {
  DEFAULT_MAX_SHOWS,
  VISIT_GAP_MS,
  isTourEligible,
  nextVisit,
  targetingIssues,
  type TourHistory,
  type TourRules,
  type VisitorFacts,
} from "../src/targeting";

const DAY = 86_400_000;
const NOW = new Date("2026-11-13T12:00:00Z");
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);

const rules = (r: Partial<TourRules> = {}): TourRules => ({
  audience: "ALL",
  audienceDays: null,
  audienceBefore: null,
  frequency: "ONCE",
  maxShows: null,
  intervalDays: null,
  startsAt: null,
  endsAt: null,
  ...r,
});
const visitor = (v: Partial<VisitorFacts> = {}): VisitorFacts => ({
  firstSeenAt: ago(100),
  lastSeenAt: NOW,
  visitStartedAt: NOW,
  previousVisitAt: ago(1),
  signedUpAt: null,
  ...v,
});
const history = (h: Partial<TourHistory> = {}): TourHistory => ({
  shows: 0,
  lastShownAt: null,
  completedAt: null,
  skippedAt: null,
  ...h,
});

describe("nextVisit", () => {
  it("creates a profile on first sight", () => {
    const v = nextVisit(null, NOW);
    expect(v).toMatchObject({ firstSeenAt: NOW, visitStartedAt: NOW, previousVisitAt: null });
  });
  it("keeps the same visit within the gap", () => {
    const start = new Date(NOW.getTime() - 10 * 60_000);
    const prev = visitor({ lastSeenAt: start, visitStartedAt: start, previousVisitAt: ago(40) });
    const v = nextVisit(prev, NOW);
    expect(v.visitStartedAt).toEqual(start);
    expect(v.previousVisitAt).toEqual(ago(40));
    expect(v.lastSeenAt).toEqual(NOW);
  });
  it("starts a new visit after the gap and remembers the last one", () => {
    const last = new Date(NOW.getTime() - VISIT_GAP_MS - 1);
    const v = nextVisit(visitor({ lastSeenAt: last }), NOW);
    expect(v.visitStartedAt).toEqual(NOW);
    expect(v.previousVisitAt).toEqual(last);
  });
});

describe("audience", () => {
  it("new users: within N days of first seen, or of signup if the site told us", () => {
    const r = rules({ audience: "NEW_USERS", audienceDays: 14 });
    expect(isTourEligible(r, visitor({ firstSeenAt: ago(3) }), null, NOW)).toBe(true);
    expect(isTourEligible(r, visitor({ firstSeenAt: ago(30) }), null, NOW)).toBe(false);
    expect(
      isTourEligible(r, visitor({ firstSeenAt: ago(1), signedUpAt: ago(60) }), null, NOW),
    ).toBe(false);
  });
  it("dormant users: this visit started N+ days after the previous one", () => {
    const r = rules({ audience: "DORMANT_USERS", audienceDays: 30 });
    expect(isTourEligible(r, visitor({ previousVisitAt: ago(45) }), null, NOW)).toBe(true);
    expect(isTourEligible(r, visitor({ previousVisitAt: ago(5) }), null, NOW)).toBe(false);
    expect(isTourEligible(r, visitor({ previousVisitAt: null }), null, NOW)).toBe(false);
  });
  it("dormant status holds for the whole visit, not just the first page", () => {
    const r = rules({ audience: "DORMANT_USERS", audienceDays: 30 });
    const first = nextVisit(visitor({ lastSeenAt: ago(45), visitStartedAt: ago(45) }), NOW);
    const later = nextVisit(first, new Date(NOW.getTime() + 5 * 60_000));
    expect(isTourEligible(r, later, null, later.lastSeenAt)).toBe(true);
  });
  it("existing users: joined before the feature launch date", () => {
    const r = rules({ audience: "EXISTING_USERS", audienceBefore: ago(10) });
    expect(isTourEligible(r, visitor({ firstSeenAt: ago(50) }), null, NOW)).toBe(true);
    expect(isTourEligible(r, visitor({ firstSeenAt: ago(2) }), null, NOW)).toBe(false);
  });
});

describe("frequency", () => {
  const v = visitor({ visitStartedAt: ago(0.01) });
  it("once: never again after any showing", () => {
    expect(isTourEligible(rules(), v, null, NOW)).toBe(true);
    expect(isTourEligible(rules(), v, history({ shows: 1, lastShownAt: ago(9) }), NOW)).toBe(false);
  });
  it("until completed: once per visit, up to the limit, stops when finished", () => {
    const r = rules({ frequency: "UNTIL_COMPLETED", maxShows: 3 });
    expect(isTourEligible(r, v, history({ shows: 1, lastShownAt: ago(2) }), NOW)).toBe(true);
    expect(isTourEligible(r, v, history({ shows: 1, lastShownAt: NOW }), NOW)).toBe(false);
    expect(isTourEligible(r, v, history({ shows: 3, lastShownAt: ago(2) }), NOW)).toBe(false);
    expect(
      isTourEligible(r, v, history({ shows: 1, lastShownAt: ago(2), completedAt: ago(2) }), NOW),
    ).toBe(false);
    expect(
      isTourEligible(r, v, history({ shows: 1, lastShownAt: ago(2), skippedAt: ago(2) }), NOW),
    ).toBe(true);
  });
  it("interval: waits N days between showings, up to the limit", () => {
    const r = rules({ frequency: "INTERVAL", intervalDays: 30 });
    expect(isTourEligible(r, v, history({ shows: 1, lastShownAt: ago(31) }), NOW)).toBe(true);
    expect(isTourEligible(r, v, history({ shows: 1, lastShownAt: ago(10) }), NOW)).toBe(false);
    expect(
      isTourEligible(r, v, history({ shows: DEFAULT_MAX_SHOWS, lastShownAt: ago(90) }), NOW),
    ).toBe(false);
  });
});

describe("date window", () => {
  it("is inclusive of whole UTC days at both ends", () => {
    const day = new Date("2026-11-13T00:00:00Z");
    const r = rules({ startsAt: day, endsAt: day });
    expect(isTourEligible(r, visitor(), null, new Date("2026-11-13T23:59:59Z"))).toBe(true);
    expect(isTourEligible(r, visitor(), null, new Date("2026-11-14T00:00:00Z"))).toBe(false);
    expect(isTourEligible(r, visitor(), null, new Date("2026-11-12T23:59:59Z"))).toBe(false);
  });
});

describe("validation", () => {
  it("requires the numbers each choice needs", () => {
    expect(targetingIssues(rules({ audience: "NEW_USERS" })).map((i) => i.path)).toEqual([
      "audienceDays",
    ]);
    expect(targetingIssues(rules({ audience: "EXISTING_USERS" }))[0]?.path).toBe("audienceBefore");
    expect(targetingIssues(rules({ frequency: "INTERVAL" }))[0]?.path).toBe("intervalDays");
    expect(targetingIssues(rules({ startsAt: ago(1), endsAt: ago(5) }))[0]?.path).toBe("endsAt");
  });
  it("create schema defaults to everyone, once", () => {
    const t = createTourSchema.parse({ name: "T", startUrl: "/" });
    expect(t).toMatchObject({ audience: "ALL", frequency: "ONCE", startsAt: null });
  });
  it("parses form values: dates, numbers as strings, blanks", () => {
    const t = updateTourSchema.parse({
      audience: "NEW_USERS",
      audienceDays: "14",
      startsAt: "2026-12-01",
      endsAt: "",
    });
    expect(t.audienceDays).toBe(14);
    expect(t.startsAt?.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(t.endsAt).toBeNull();
    expect(updateTourSchema.safeParse({ startsAt: "2026-02-30" }).success).toBe(false);
    expect(updateTourSchema.safeParse({ maxShows: 0 }).success).toBe(false);
  });
  it("create schema rejects incomplete rules", () => {
    const r = createTourSchema.safeParse({ name: "T", startUrl: "/", audience: "DORMANT_USERS" });
    expect(r.success).toBe(false);
  });
});

describe("identity and visit schemas", () => {
  it("accepts the Redington setups and rejects code", () => {
    expect(identitySchema.parse({ identitySource: "WINDOW", identityKey: "userId" })).toEqual({
      identitySource: "WINDOW",
      identityKey: "userId",
    });
    expect(
      identitySchema.safeParse({ identitySource: "DATALAYER", identityKey: "customer_code" })
        .success,
    ).toBe(true);
    expect(
      identitySchema.safeParse({ identitySource: "WINDOW", identityKey: "alert(1)" }).success,
    ).toBe(false);
    expect(identitySchema.parse({ identitySource: "NONE", identityKey: "x" }).identityKey).toBe(
      null,
    );
  });
  it("visit requests trim user ids and normalise signup dates", () => {
    const v = visitRequestSchema.parse({
      projectKey: "pk_demoShop0000000000000000",
      visitorId: "v_12345678",
      userId: "  C1001 ",
      signedUpAt: "2025-03-04T10:00:00Z",
    });
    expect(v.userId).toBe("C1001");
    expect(v.signedUpAt?.toISOString()).toBe("2025-03-04T00:00:00.000Z");
    expect(
      visitRequestSchema.safeParse({
        projectKey: "pk_demoShop0000000000000000",
        visitorId: "v_12345678",
        userId: "",
      }).success,
    ).toBe(false);
  });
});
