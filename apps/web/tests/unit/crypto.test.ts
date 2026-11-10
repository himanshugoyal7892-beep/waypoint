import { describe, expect, it } from "vitest";
import { PUBLIC_KEY_PATTERN } from "@waypoint/shared";
import {
  generateAccessToken,
  generateBuilderPass,
  generatePublicKey,
  randomBase62,
  safeEqualHex,
  sha256Hex,
} from "@/server/crypto";

describe("crypto helpers", () => {
  it("generates public keys in the validated format", () => {
    for (let i = 0; i < 50; i++) expect(generatePublicKey()).toMatch(PUBLIC_KEY_PATTERN);
  });
  it("generates unique 256-bit passes and tokens", () => {
    const passes = new Set(Array.from({ length: 200 }, generateBuilderPass));
    expect(passes.size).toBe(200);
    expect(generateBuilderPass()).toMatch(/^wpb_[A-Za-z0-9_-]{43}$/);
    expect(generateAccessToken()).toMatch(/^wpa_[A-Za-z0-9_-]{43}$/);
  });
  it("hashes deterministically and compares safely", () => {
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(safeEqualHex(sha256Hex("a"), sha256Hex("a"))).toBe(true);
    expect(safeEqualHex(sha256Hex("a"), sha256Hex("b"))).toBe(false);
    expect(safeEqualHex("ab", "abcd")).toBe(false);
  });
  it("produces base62 of the requested length", () => {
    expect(randomBase62(100)).toMatch(/^[0-9A-Za-z]{100}$/);
  });
});
