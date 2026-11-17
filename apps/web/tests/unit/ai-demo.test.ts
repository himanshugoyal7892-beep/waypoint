import { describe, expect, it } from "vitest";
import { aiDraftSchema } from "@waypoint/shared";
import { demoDraft, demoReview, demoReword } from "@/server/ai/demo";

const el = (selector: string, tag: string, text: string, y: number, label = "") => ({
  selector,
  tag,
  text,
  label,
  role: "",
  y,
});

describe("demo mode", () => {
  const elements = [
    el('[data-testid="top-header-container"]', "div", "support@x.com Track Orders UAE English", 0),
    el('[data-testid="top-header-left-list-link-1"]', "a", "Track Orders", 0),
    el('[data-testid="header-signin-1"]', "a", "Login", 2),
    el('[data-testid="header-signin-2"]', "a", "Become a Partner", 2),
    el('[data-testid="guest-navigation-list"]', "ul", "Home About Us FAQ's Contact Us", 3),
    el('[data-testid="search-by-text"]', "span", "Search by:", 3),
    el('[data-testid="flipSearchAnimation-section"]', "div", "Search by: Part number", 3),
    el('[data-testid="navigation-list-restricted-all-categories-0"]', "span", "All Categories", 4),
    el("h2.featured", "h2", "FEATURED PRODUCTS", 40),
  ];

  it("drafts from real page parts, picking the most specific element for each", () => {
    const d = demoDraft(
      aiDraftSchema.parse({ tourId: "t", pageUrl: "/en-ae", stepCount: 5, elements }),
    );
    expect(d.name).toBe("Home page: guided tour");
    const by = Object.fromEntries(d.steps.map((s) => [s.title, s.cssSelector]));
    expect(by["Track your orders"]).toBe('[data-testid="top-header-left-list-link-1"]');
    expect(by["Find any product fast"]).toBe('[data-testid="flipSearchAnimation-section"]');
    expect(by["Browse every category"]).toContain("all-categories");
    expect(d.steps).toHaveLength(5);
  });

  it("lets the goal decide what makes the cut", () => {
    const d = demoDraft(
      aiDraftSchema.parse({
        tourId: "t",
        pageUrl: "/",
        stepCount: 3,
        goal: "track orders",
        elements,
      }),
    );
    expect(d.steps.map((s) => s.title)).toContain("Track your orders");
  });

  it("translates demo-tour text to Arabic and back, and explains unknown text", () => {
    const ar = demoReword({
      action: "ARABIC",
      title: "Your country store",
      description: "Prices, stock and currency follow the country you pick here.",
    });
    expect(ar.title).toBe("متجر بلدك");
    const en = demoReword({ action: "ENGLISH", title: ar.title, description: ar.description });
    expect(en.title).toBe("Your country store");
    expect(() => demoReword({ action: "ARABIC", title: "Brand new", description: "" })).toThrow(
      /Demo mode/,
    );
  });

  it("fixes typos and vague titles when asked for clearer text", () => {
    expect(
      demoReword({ action: "CLEARER", title: "Click Add to cart Botton", description: "" }),
    ).toEqual({
      title: "Add to cart",
      description: "Add this product to your cart and keep shopping.",
    });
  });

  it("reviews the drop-off step with a different, shorter rewrite", () => {
    const r = demoReview({
      tourName: "T",
      steps: [
        {
          id: "a",
          stepOrder: 1,
          title: "Need help?",
          description: "Our team is one click away on Contact Us.",
          pageUrl: "/",
        },
        { id: "b", stepOrder: 2, title: "Next", description: "x", pageUrl: "/" },
      ],
      started: 20,
      completed: 2,
      viewedByStep: { 1: 20, 2: 4 },
      dropOff: { fromOrder: 1, toOrder: 2, lost: 16 },
    });
    expect(r.basedOn).toBe("dropoff");
    expect(r.summary).toContain("16 visitors leave on step 1");
    expect(r.suggestions[0]!.stepId).toBe("a");
    expect(r.suggestions[0]!.description).not.toBe("Our team is one click away on Contact Us.");
  });
});
