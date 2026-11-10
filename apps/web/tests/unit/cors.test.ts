import { describe, expect, it } from "vitest";
import { BUILDER_CORS, bearerToken, corsHeaders, requestOrigin } from "@/server/public/cors-core";

describe("corsHeaders", () => {
  it("echoes only allowed origins, never *", () => {
    const h = corsHeaders("http://localhost:5173", true, BUILDER_CORS);
    expect(h["Access-Control-Allow-Origin"]).toBe("http://localhost:5173");
    expect(h["Access-Control-Allow-Headers"]).toBe("Authorization, Content-Type");
    expect(h.Vary).toBe("Origin");
    expect(JSON.stringify(h)).not.toContain('"*"');
    expect(h["Access-Control-Allow-Credentials"]).toBeUndefined();
  });
  it("omits allow headers for disallowed origins", () => {
    const h = corsHeaders("https://evil.example.com", false);
    expect(h["Access-Control-Allow-Origin"]).toBeUndefined();
    expect(h.Vary).toBe("Origin");
  });
});

describe("bearerToken", () => {
  it("parses bearer headers", () => {
    expect(bearerToken("Bearer wpa_abc")).toBe("wpa_abc");
    expect(bearerToken("bearer  wpa_abc ")).toBe("wpa_abc");
    expect(bearerToken("Basic xyz")).toBeNull();
    expect(bearerToken(null)).toBeNull();
  });
});

describe("requestOrigin", () => {
  const url = "https://app.example.com/api/public/v1/projects/pk/tours";
  it("prefers the Origin header", () => {
    expect(requestOrigin(new Headers({ origin: "http://localhost:5173" }), url)).toBe(
      "http://localhost:5173",
    );
  });
  it("falls back to the request origin only for browser same-origin requests", () => {
    expect(requestOrigin(new Headers({ "sec-fetch-site": "same-origin" }), url)).toBe(
      "https://app.example.com",
    );
    expect(requestOrigin(new Headers({ "sec-fetch-site": "cross-site" }), url)).toBeNull();
    expect(requestOrigin(new Headers(), url)).toBeNull();
  });
});
