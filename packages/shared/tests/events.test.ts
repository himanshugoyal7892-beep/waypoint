import { describe, expect, it } from "vitest";
import { analyticsBatchSchema, publicToursQuerySchema } from "../src/schemas/events";

const event = (overrides: Record<string, unknown> = {}) => ({
  clientEventId: "evt_12345678",
  tourId: "tour_1",
  tourVersion: 2,
  anonymousVisitorId: "vis_12345678",
  sessionId: "ses_12345678",
  eventName: "tour_started",
  currentUrl: "https://shop.example.com/?q=secret#frag",
  timestamp: 1_762_761_600_000,
  ...overrides,
});
const batch = (events: unknown[]) => ({ projectKey: "pk_demoShop0000000000000000", events });

describe("analyticsBatchSchema", () => {
  it("accepts a valid batch and sanitises URLs to origin + pathname", () => {
    const out = analyticsBatchSchema.parse(batch([event()]));
    expect(out.events[0]?.currentUrl).toBe("https://shop.example.com/");
  });
  it("requires stepId + stepOrder on step-scoped events", () => {
    expect(
      analyticsBatchSchema.safeParse(batch([event({ eventName: "step_viewed" })])).success,
    ).toBe(false);
    expect(
      analyticsBatchSchema.safeParse(
        batch([event({ eventName: "step_viewed", stepId: "step_1", stepOrder: 1 })]),
      ).success,
    ).toBe(true);
  });
  it("allows errorCode only on error events", () => {
    expect(
      analyticsBatchSchema.safeParse(
        batch([
          event({
            eventName: "element_not_found",
            stepId: "s",
            stepOrder: 1,
            errorCode: "timeout",
          }),
        ]),
      ).success,
    ).toBe(true);
    expect(analyticsBatchSchema.safeParse(batch([event({ errorCode: "timeout" })])).success).toBe(
      false,
    );
  });
  it("rejects unknown event names, extra fields (no page content), bad ids and bad URLs", () => {
    expect(
      analyticsBatchSchema.safeParse(batch([event({ eventName: "clicked_buy" })])).success,
    ).toBe(false);
    expect(analyticsBatchSchema.safeParse(batch([event({ pageText: "secret" })])).success).toBe(
      false,
    );
    expect(
      analyticsBatchSchema.safeParse(batch([event({ anonymousVisitorId: "short" })])).success,
    ).toBe(false);
    expect(
      analyticsBatchSchema.safeParse(batch([event({ currentUrl: "javascript:alert(1)" })])).success,
    ).toBe(false);
    expect(analyticsBatchSchema.safeParse(batch([event({ timestamp: -1 })])).success).toBe(false);
  });
  it("enforces batch size and project key format", () => {
    expect(analyticsBatchSchema.safeParse(batch([])).success).toBe(false);
    expect(
      analyticsBatchSchema.safeParse(batch(Array.from({ length: 21 }, () => event()))).success,
    ).toBe(false);
    expect(
      analyticsBatchSchema.safeParse({ projectKey: "pk_bad", events: [event()] }).success,
    ).toBe(false);
  });
});

describe("publicToursQuerySchema", () => {
  it("accepts pathnames only", () => {
    expect(publicToursQuerySchema.safeParse({ path: "/cart" }).success).toBe(true);
    expect(publicToursQuerySchema.safeParse({ path: "https://a.com/" }).success).toBe(false);
    expect(publicToursQuerySchema.safeParse({ path: "/x?y" }).success).toBe(false);
    expect(publicToursQuerySchema.safeParse({}).success).toBe(false);
  });
});
