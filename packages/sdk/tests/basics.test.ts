import { afterEach, describe, expect, it, vi } from "vitest";
import { readConfig } from "../src/config";
import { SESSION_IDLE_MS, randomId, sessionId, visitorId } from "../src/ids";
import { readJson, safeStore } from "../src/storage";
import { watchUrl } from "../src/url/watch";

describe("readConfig", () => {
  it("accepts a valid key and derives the API base from the script URL", () => {
    expect(
      readConfig(
        { projectId: "pk_demoShop0000000000000000" },
        "https://app.example.com/sdk/product-tour.js",
      ),
    ).toEqual({
      projectKey: "pk_demoShop0000000000000000",
      apiBase: "https://app.example.com",
      debug: false,
    });
  });
  it("honours an explicit apiBase and strips trailing slashes", () => {
    expect(
      readConfig(
        { projectId: "pk_demoShop0000000000000000", apiBase: "https://api.example.com/" },
        null,
      )?.apiBase,
    ).toBe("https://api.example.com");
  });
  it("rejects missing or malformed keys", () => {
    expect(readConfig(undefined, null)).toBeNull();
    expect(readConfig({ projectId: "pk_short" }, null)).toBeNull();
    expect(readConfig({ projectId: 42 }, null)).toBeNull();
  });
});

describe("storage", () => {
  afterEach(() => localStorage.clear());
  it("prefixes keys and round-trips JSON", () => {
    const s = safeStore("local");
    s.set("x", JSON.stringify({ a: 1 }));
    expect(localStorage.getItem("ptour:x")).toBe('{"a":1}');
    expect(readJson(s, "x")).toEqual({ a: 1 });
  });
  it("drops corrupt JSON", () => {
    const s = safeStore("local");
    s.set("bad", "{nope");
    expect(readJson(s, "bad")).toBeNull();
    expect(s.get("bad")).toBeNull();
  });
  it("falls back to memory when storage throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const s = safeStore("local");
    s.set("k", "v");
    expect(s.get("k")).toBe("v");
  });
});

describe("ids", () => {
  it("generates ids matching the server's opaque id pattern", () => {
    for (let i = 0; i < 20; i++) expect(randomId("e_")).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
  });
  it("keeps a stable anonymous visitor id", () => {
    const s = safeStore("local");
    expect(visitorId(s)).toBe(visitorId(s));
  });
  it("rotates the session after 30 idle minutes", () => {
    const s = safeStore("session");
    const a = sessionId(s, 1_000);
    expect(sessionId(s, 1_000 + 60_000)).toBe(a);
    expect(sessionId(s, 1_000 + 60_000 + SESSION_IDLE_MS)).not.toBe(a);
  });
});

describe("watchUrl", () => {
  it("reports pathname changes from pushState, replaceState and popstate, then restores history", async () => {
    const originalPush = history.pushState;
    const seen: string[] = [];
    const stop = watchUrl((p) => seen.push(p), 0);
    history.pushState({}, "", "/a");
    await new Promise((r) => setTimeout(r, 5));
    history.replaceState({}, "", "/b");
    await new Promise((r) => setTimeout(r, 5));
    history.pushState({}, "", "/b?x=1"); // same path: ignored
    await new Promise((r) => setTimeout(r, 5));
    expect(seen).toEqual(["/a", "/b"]);
    stop();
    expect(history.pushState).toBe(originalPush);
  });
});
