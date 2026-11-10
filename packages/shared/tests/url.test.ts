import { describe, expect, it } from "vitest";
import {
  matchPathPattern,
  normalizePathname,
  sanitizeTrackedUrl,
  validatePathname,
  validatePathPattern,
} from "../src/url";

describe("sanitizeTrackedUrl (origin + pathname only)", () => {
  it("strips query strings and fragments", () => {
    expect(
      sanitizeTrackedUrl("https://shop.example.com/cart?email=a@b.com&token=x#ptb_token=secret"),
    ).toBe("https://shop.example.com/cart");
  });
  it("removes builder pass fragments and builder query params", () => {
    expect(sanitizeTrackedUrl("http://localhost:5173/?tour_builder=pk_x#ptb_token=wpb_abc")).toBe(
      "http://localhost:5173/",
    );
  });
  it("normalises host case, default ports and trailing slashes", () => {
    expect(sanitizeTrackedUrl("HTTPS://Shop.Example.com:443/Products/")).toBe(
      "https://shop.example.com/Products",
    );
    expect(sanitizeTrackedUrl("https://a.com//x//y/")).toBe("https://a.com/x/y");
  });
  it("rejects non-http schemes, credentials and garbage", () => {
    expect(sanitizeTrackedUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeTrackedUrl("file:///etc/passwd")).toBeNull();
    expect(sanitizeTrackedUrl("https://user:pass@a.com/")).toBeNull();
    expect(sanitizeTrackedUrl("/relative/path")).toBeNull();
    expect(sanitizeTrackedUrl("")).toBeNull();
    expect(sanitizeTrackedUrl(`https://a.com/${"x".repeat(3000)}`)).toBeNull();
  });
});

describe("normalizePathname", () => {
  it("keeps root and removes trailing slash elsewhere", () => {
    expect(normalizePathname("/")).toBe("/");
    expect(normalizePathname("/cart/")).toBe("/cart");
    expect(normalizePathname("cart")).toBe("/cart");
  });
});

describe("validatePathname", () => {
  it("accepts concrete paths", () => {
    expect(validatePathname("/")).toBeNull();
    expect(validatePathname("/products/aurora-headphones")).toBeNull();
    expect(validatePathname("/a%20b")).toBeNull();
  });
  it("rejects full URLs, queries, fragments, wildcards and spaces with actionable messages", () => {
    expect(validatePathname("https://a.com/x")).toMatch(/start with/);
    expect(validatePathname("/x?y=1")).toMatch(/query string/);
    expect(validatePathname("/x#y")).toMatch(/fragment/);
    expect(validatePathname("/products/*")).toMatch(/Wildcards/);
    expect(validatePathname("/a b")).toMatch(/spaces/);
    expect(validatePathname("/a%zz")).toMatch(/escape/);
    expect(validatePathname("")).toMatch(/Enter a page path/);
  });
});

describe("validatePathPattern + matchPathPattern", () => {
  it("allows a single * wildcard", () => {
    expect(validatePathPattern("/products/*")).toBeNull();
    expect(validatePathPattern("/products/**")).toMatch(/single \*/);
  });
  it("matches exact paths ignoring trailing slashes", () => {
    expect(matchPathPattern("/", "/")).toBe(true);
    expect(matchPathPattern("/cart", "/cart/")).toBe(true);
    expect(matchPathPattern("/cart", "/carts")).toBe(false);
  });
  it("matches wildcards across segments", () => {
    expect(matchPathPattern("/products/*", "/products/a")).toBe(true);
    expect(matchPathPattern("/products/*", "/products/a/reviews")).toBe(true);
    expect(matchPathPattern("/products/*", "/product")).toBe(false);
    expect(matchPathPattern("/*", "/anything")).toBe(true);
  });
  it("treats regex metacharacters literally", () => {
    expect(matchPathPattern("/a.b", "/axb")).toBe(false);
    expect(matchPathPattern("/a(b)", "/a(b)")).toBe(true);
  });
});
