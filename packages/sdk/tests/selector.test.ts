import { afterEach, describe, expect, it } from "vitest";
import { generateSelector, looksGenerated, matchCount } from "../src/builder/selector";

function mount(markup: string) {
  // Test fixtures only: build DOM from trusted static strings via DOMParser (no innerHTML sink).
  const doc = new DOMParser().parseFromString(`<body>${markup}</body>`, "text/html");
  document.body.replaceChildren(
    ...Array.from(doc.body.childNodes).map((n) => document.importNode(n, true)),
  );
}
const $ = (sel: string) => document.querySelector(sel)!;
afterEach(() => document.body.replaceChildren());

describe("looksGenerated", () => {
  it("flags machine-generated values", () => {
    for (const v of [
      "css-1x2y3z",
      "sc-bdfBwQ",
      "jsx-123456",
      "Button__a1b2c",
      "card_x7f3k",
      ":r1:",
      "radix-12",
      "hover:bg-red",
      "w-[200px]",
      "item-20481",
      "a9f3c2e1b7",
    ])
      expect(looksGenerated(v), v).toBe(true);
  });
  it("keeps human-written values", () => {
    for (const v of [
      "search",
      "add-to-cart",
      "primary",
      "nav-item",
      "btn-large",
      "card_large",
      "checkout",
    ])
      expect(looksGenerated(v), v).toBe(false);
  });
});

describe("generateSelector priority", () => {
  it("1. prefers data-tour-id", () => {
    mount(`<button id="buy" data-testid="buy-btn" data-tour-id="add-to-cart">Add</button>`);
    expect(generateSelector($("button"))).toEqual({
      selector: '[data-tour-id="add-to-cart"]',
      quality: "stable",
      reasons: [],
    });
  });
  it("2. then a stable id", () => {
    mount(`<input id="search" data-testid="search-input">`);
    expect(generateSelector($("input")).selector).toBe("#search");
  });
  it("skips generated ids and uses a stable data attribute", () => {
    mount(`<button id=":r3:" data-testid="checkout">Pay</button>`);
    expect(generateSelector($("button"))).toMatchObject({
      selector: '[data-testid="checkout"]',
      quality: "stable",
    });
  });
  it("rates data attributes containing long numbers as 'good' with a reason", () => {
    mount(`<a data-testid="header-signin-2202" href="/login">Login</a>`);
    const r = generateSelector($("a"));
    expect(r.selector).toBe('[data-testid="header-signin-2202"]');
    expect(r.quality).toBe("good");
    expect(r.reasons[0]).toMatch(/number/);
  });
  it("4. falls back to accessible attributes", () => {
    mount(`<button class="css-9x8y7z" aria-label="Open cart">🛒</button>`);
    expect(generateSelector($("button"))).toMatchObject({
      selector: 'button[aria-label="Open cart"]',
      quality: "good",
    });
  });
  it("5. uses tag + stable classes, ignoring generated ones", () => {
    mount(`<div><span class="sc-abc12 price-tag">$9</span></div>`);
    expect(generateSelector($("span")).selector).toBe("span.price-tag");
  });
  it("anchors on a unique ancestor when the element itself isn't unique", () => {
    mount(
      `<ul data-testid="nav"><li><a class="link">A</a></li><li><a class="link">B</a></li></ul><a class="link">C</a>`,
    );
    const r = generateSelector($('[data-testid="nav"] li:nth-of-type(2) a'));
    expect(matchCount(r.selector)).toBe(1);
    expect(document.querySelector(r.selector)?.textContent).toBe("B");
    expect(r.selector.startsWith('[data-testid="nav"]')).toBe(true);
    expect(r.quality).toBe("fragile");
  });
  it("finds the right element among duplicated test ids", () => {
    mount(
      `<section data-testid="grid"><div data-testid="card"><a href="/p/1">1</a></div><div data-testid="card"><a href="/p/2">2</a></div></section>`,
    );
    const r = generateSelector($('a[href="/p/2"]'));
    expect(document.querySelector(r.selector)?.textContent).toBe("2");
  });
  it("3. ends with a positional path marked fragile", () => {
    mount(`<div><div><p>x</p><p>y</p></div></div>`);
    const r = generateSelector($("div div p:nth-of-type(2)"));
    expect(document.querySelector(r.selector)?.textContent).toBe("y");
    expect(r.quality).toBe("fragile");
    expect(r.reasons[0]).toMatch(/may break/);
  });
  it("escapes awkward attribute values", () => {
    mount(
      `<a data-testid='navigation-list-print-&-consumables--4'>P</a><span data-testid='say "hi"'>Q</span>`,
    );
    expect(document.querySelector(generateSelector($("a")).selector)?.textContent).toBe("P");
    expect(document.querySelector(generateSelector($("span")).selector)?.textContent).toBe("Q");
  });
});

describe("matchCount", () => {
  it("counts matches and reports invalid selectors", () => {
    mount(`<i></i><i></i>`);
    expect(matchCount("i")).toBe(2);
    expect(matchCount("#none")).toBe(0);
  });
});

describe("hidden duplicates (responsive layouts)", () => {
  it("accepts a selector whose other matches are hidden, and says so", () => {
    mount(
      `<header class="mobile" style="display:none"><input id="search"></header><header><input id="search"></header>`,
    );
    const visible = document.querySelectorAll("input")[1]!;
    const original = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function (this: Element) {
      const shown = !this.closest(".mobile");
      return {
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: shown ? 100 : 0,
        bottom: shown ? 20 : 0,
        width: shown ? 100 : 0,
        height: shown ? 20 : 0,
        toJSON: () => ({}),
      } as DOMRect;
    };
    try {
      const r = generateSelector(visible);
      expect(r.selector).toBe("#search");
      expect(r.quality).toBe("good");
      expect(r.reasons.join(" ")).toMatch(/hidden copies/);
    } finally {
      Element.prototype.getBoundingClientRect = original;
    }
  });
});
