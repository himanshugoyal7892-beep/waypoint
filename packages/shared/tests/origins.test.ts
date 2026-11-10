import { describe, expect, it } from "vitest";
import {
  explainInvalidOrigin,
  isOriginAllowed,
  normalizeOrigin,
  normalizeOriginList,
} from "../src/origins";

describe("normalizeOrigin", () => {
  it("canonicalises valid origins", () => {
    expect(normalizeOrigin("https://Shop.Example.com")).toBe("https://shop.example.com");
    expect(normalizeOrigin("https://shop.example.com/")).toBe("https://shop.example.com");
    expect(normalizeOrigin("https://shop.example.com:443")).toBe("https://shop.example.com");
    expect(normalizeOrigin("https://shop.example.com:8443")).toBe("https://shop.example.com:8443");
    expect(normalizeOrigin("http://localhost:5173")).toBe("http://localhost:5173");
    expect(normalizeOrigin("http://127.0.0.1:3000")).toBe("http://127.0.0.1:3000");
  });
  it("rejects paths, queries, wildcards, credentials, bare hosts and non-http schemes", () => {
    for (const bad of [
      "https://shop.example.com/app",
      "https://shop.example.com?x=1",
      "https://*.example.com",
      "https://u:p@example.com",
      "shop.example.com",
      "ftp://example.com",
      "null",
      "",
    ])
      expect(normalizeOrigin(bad), bad).toBeNull();
  });
  it("allows plain http only for local hosts", () => {
    expect(normalizeOrigin("http://shop.example.com")).toBeNull();
    expect(normalizeOrigin("http://app.localhost:8080")).toBe("http://app.localhost:8080");
  });
});

describe("isOriginAllowed", () => {
  const allowed = ["https://shop.example.com", "http://localhost:5173"];
  it("matches exact origins only", () => {
    expect(isOriginAllowed("https://shop.example.com", allowed)).toBe(true);
    expect(isOriginAllowed("http://localhost:5173", allowed)).toBe(true);
    expect(isOriginAllowed("https://evil-shop.example.com", allowed)).toBe(false);
    expect(isOriginAllowed("https://shop.example.com.evil.com", allowed)).toBe(false);
    expect(isOriginAllowed("http://localhost:5174", allowed)).toBe(false);
    expect(isOriginAllowed("http://shop.example.com", allowed)).toBe(false);
  });
  it("rejects missing and null origins", () => {
    expect(isOriginAllowed(null, allowed)).toBe(false);
    expect(isOriginAllowed(undefined, allowed)).toBe(false);
    expect(isOriginAllowed("null", allowed)).toBe(false);
  });
  it("rejects everything when the list is empty", () => {
    expect(isOriginAllowed("https://shop.example.com", [])).toBe(false);
  });
});

describe("normalizeOriginList / explainInvalidOrigin", () => {
  it("normalises and de-duplicates", () => {
    expect(normalizeOriginList(["https://A.com", "https://a.com/", "bad"])).toEqual([
      "https://a.com",
    ]);
  });
  it("gives actionable messages", () => {
    expect(explainInvalidOrigin("shop.example.com")).toMatch(/Include the scheme/);
    expect(explainInvalidOrigin("https://a.com/path")).toMatch(/Remove the path/);
    expect(explainInvalidOrigin("http://a.com")).toMatch(/only allowed for localhost/);
  });
});
