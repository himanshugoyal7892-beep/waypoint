import { afterEach, describe, expect, it } from "vitest";
import { readUserId } from "../src/identity";

const w = window as unknown as Record<string, unknown>;

afterEach(() => {
  delete w.userId;
  delete w.app;
  delete w.dataLayer;
  document.cookie = "uid=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
});

describe("readUserId (no-code identity)", () => {
  it("reads a page variable, including dotted paths", () => {
    w.userId = "C1001";
    expect(readUserId({ source: "WINDOW", key: "userId" })).toBe("C1001");
    w.app = { user: { id: 42 } };
    expect(readUserId({ source: "WINDOW", key: "app.user.id" })).toBe("42");
  });

  it("treats logged-out placeholders as nobody", () => {
    for (const v of ["", "  ", "null", "undefined", "0", "guest", undefined, {}]) {
      w.userId = v;
      expect(readUserId({ source: "WINDOW", key: "userId" })).toBeNull();
    }
  });

  it("takes the latest non-empty Tag Manager value (Redington's customer_code)", () => {
    w.dataLayer = [
      { event: "gtm.js" },
      { event: "home_page_view", customer_code: "R-778", email_id: "a@b.c" },
      { event: "pageview", customer_code: "" },
    ];
    expect(readUserId({ source: "DATALAYER", key: "customer_code" })).toBe("R-778");
  });

  it("reads and decodes a cookie", () => {
    document.cookie = "uid=abc%20123; path=/";
    expect(readUserId({ source: "COOKIE", key: "uid" })).toBe("abc 123");
    expect(readUserId({ source: "COOKIE", key: "missing" })).toBeNull();
  });

  it("returns null when not configured", () => {
    w.userId = "C1001";
    expect(readUserId(null)).toBeNull();
  });
});
