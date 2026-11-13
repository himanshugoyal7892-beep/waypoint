import { describe, expect, it } from "vitest";
import { createProjectSchema, updateProjectSchema } from "../src/schemas/project";
import { createStepSchema, reorderStepsSchema, updateStepSchema } from "../src/schemas/step";
import { createTourSchema, updateTourSchema } from "../src/schemas/tour";
import { createBuilderPassSchema, redeemBuilderPassSchema } from "../src/schemas/builder";

describe("project schemas", () => {
  it("normalises name, domain and origins", () => {
    const out = createProjectSchema.parse({
      name: "  Demo\u0000 Shop  ",
      domain: "HTTPS://Shop.Example.com/",
      allowedOrigins: ["https://Shop.Example.com", "https://shop.example.com/"],
    });
    expect(out).toEqual({
      name: "Demo Shop",
      domain: "shop.example.com",
      allowedOrigins: ["https://shop.example.com"],
    });
  });
  it("defaults allowedOrigins to [] and accepts localhost:port domains", () => {
    expect(
      createProjectSchema.parse({ name: "x", domain: "localhost:5173" }).allowedOrigins,
    ).toEqual([]);
  });
  it("rejects invalid origins with an actionable message", () => {
    const r = createProjectSchema.safeParse({
      name: "x",
      domain: "a.com",
      allowedOrigins: ["a.com"],
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toMatch(/Include the scheme/);
  });
  it("rejects empty names, bad domains, too many origins and empty updates", () => {
    expect(createProjectSchema.safeParse({ name: "   ", domain: "a.com" }).success).toBe(false);
    expect(createProjectSchema.safeParse({ name: "x", domain: "not a domain" }).success).toBe(
      false,
    );
    const many = Array.from({ length: 21 }, (_, i) => `https://s${i}.example.com`);
    expect(
      createProjectSchema.safeParse({ name: "x", domain: "a.com", allowedOrigins: many }).success,
    ).toBe(false);
    expect(updateProjectSchema.safeParse({}).success).toBe(false);
  });
});

describe("tour schemas", () => {
  it("applies defaults and nulls empty descriptions", () => {
    expect(createTourSchema.parse({ name: "T", startUrl: "/products/*", description: "" })).toEqual(
      {
        name: "T",
        startUrl: "/products/*",
        description: null,
        triggerType: "AUTO",
        audience: "ALL",
        audienceDays: null,
        audienceBefore: null,
        frequency: "ONCE",
        maxShows: null,
        intervalDays: null,
        startsAt: null,
        endsAt: null,
      },
    );
  });
  it("rejects bad start URLs and triggers", () => {
    expect(createTourSchema.safeParse({ name: "T", startUrl: "https://a.com/" }).success).toBe(
      false,
    );
    expect(
      createTourSchema.safeParse({ name: "T", startUrl: "/", triggerType: "SOMETIMES" }).success,
    ).toBe(false);
    expect(updateTourSchema.safeParse({}).success).toBe(false);
  });
});

describe("step schemas", () => {
  const base = { pageUrl: "/", cssSelector: '[data-tour-id="x"]', title: "Hi" };
  it("applies defaults", () => {
    expect(createStepSchema.parse(base)).toMatchObject({
      placement: "AUTO",
      nextButtonLabel: "Next",
      backButtonLabel: "Back",
      allowSkip: true,
      description: "",
    });
  });
  it("requires a title or a description", () => {
    const r = createStepSchema.safeParse({ ...base, title: "  " });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toEqual(["title"]);
    expect(createStepSchema.safeParse({ ...base, title: "", description: "Body" }).success).toBe(
      true,
    );
  });
  it("keeps content as plain text (no HTML interpretation) but strips control characters", () => {
    const out = createStepSchema.parse({
      ...base,
      title: "<b>Bold</b>\u0007",
      description: "Line 1\r\nLine 2",
    });
    expect(out.title).toBe("<b>Bold</b>");
    expect(out.description).toBe("Line 1\nLine 2");
  });
  it("rejects bad selectors, paths, orders, placements and labels", () => {
    expect(createStepSchema.safeParse({ ...base, cssSelector: "" }).success).toBe(false);
    expect(createStepSchema.safeParse({ ...base, cssSelector: "a\nb" }).success).toBe(false);
    expect(createStepSchema.safeParse({ ...base, pageUrl: "/x?y=1" }).success).toBe(false);
    expect(createStepSchema.safeParse({ ...base, stepOrder: 0 }).success).toBe(false);
    expect(createStepSchema.safeParse({ ...base, stepOrder: 1.5 }).success).toBe(false);
    expect(createStepSchema.safeParse({ ...base, placement: "MIDDLE" }).success).toBe(false);
    expect(createStepSchema.safeParse({ ...base, nextButtonLabel: "" }).success).toBe(false);
    expect(createStepSchema.safeParse({ ...base, nextButtonLabel: "x".repeat(31) }).success).toBe(
      false,
    );
    expect(updateStepSchema.safeParse({}).success).toBe(false);
  });
  it("validates reorder payloads", () => {
    expect(reorderStepsSchema.safeParse({ stepIds: ["a", "b"] }).success).toBe(true);
    expect(reorderStepsSchema.safeParse({ stepIds: ["a", "a"] }).success).toBe(false);
    expect(reorderStepsSchema.safeParse({ stepIds: [] }).success).toBe(false);
    expect(reorderStepsSchema.safeParse({ stepIds: ["a b"] }).success).toBe(false);
  });
});

describe("builder pass schemas", () => {
  it("requires a tour for preview", () => {
    expect(
      createBuilderPassSchema.safeParse({ mode: "PREVIEW", targetUrl: "http://localhost:5173/" })
        .success,
    ).toBe(false);
    expect(
      createBuilderPassSchema.safeParse({ mode: "BUILD", targetUrl: "http://localhost:5173/" })
        .success,
    ).toBe(true);
  });
  it("validates pass format", () => {
    expect(redeemBuilderPassSchema.safeParse({ pass: `wpb_${"A".repeat(43)}` }).success).toBe(true);
    expect(redeemBuilderPassSchema.safeParse({ pass: "wpb_short" }).success).toBe(false);
  });
});
