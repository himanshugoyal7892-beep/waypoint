import { describe, expect, it } from "vitest";
import {
  BuilderPassError,
  authenticateAccessToken,
  buildLaunchUrl,
  issuePass,
  passStatus,
  redeemPass,
  type BuilderPassStore,
  type BuilderSessionRecord,
} from "@/server/builder-pass/core";

type Row = BuilderSessionRecord & {
  passHash: string;
  accessTokenHash: string | null;
  lastUsedAt: Date | null;
};

function memoryStore() {
  const rows: Row[] = [];
  const store: BuilderPassStore = {
    async create(data) {
      const row: Row = {
        id: `bs_${rows.length + 1}`,
        ...data,
        redeemedAt: null,
        revokedAt: null,
        accessTokenHash: null,
        lastUsedAt: null,
      };
      rows.push(row);
      return { id: row.id };
    },
    async findByPassHash(h) {
      return rows.find((r) => r.passHash === h) ?? null;
    },
    // Mirrors the SQL conditional UPDATE … WHERE redeemedAt IS NULL AND revokedAt IS NULL AND expiresAt > now
    async consume(h, tokenHash, now) {
      const r = rows.find(
        (x) => x.passHash === h && !x.redeemedAt && !x.revokedAt && x.expiresAt > now,
      );
      if (!r) return false;
      r.redeemedAt = now;
      r.accessTokenHash = tokenHash;
      return true;
    },
    async findByAccessTokenHash(h) {
      return rows.find((r) => r.accessTokenHash === h) ?? null;
    },
    async touch(id, now) {
      const r = rows.find((x) => x.id === id);
      if (r) r.lastUsedAt = now;
    },
  };
  return { store, rows };
}

const ORIGIN = "http://localhost:5173";
const T0 = new Date("2026-11-10T10:00:00Z");
const minutes = (m: number) => new Date(T0.getTime() + m * 60_000);

async function issue(store: BuilderPassStore, ttlMinutes = 120) {
  return issuePass(store, {
    projectId: "p1",
    tourId: "t1",
    mode: "BUILD",
    targetOrigin: ORIGIN,
    createdById: "u1",
    ttlMinutes,
    now: T0,
  });
}

async function rejection(p: Promise<unknown>) {
  const err = await p.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(BuilderPassError);
  return (err as BuilderPassError).reason;
}

describe("issuePass", () => {
  it("stores only a hash and caps the TTL at two hours", async () => {
    const { store, rows } = memoryStore();
    const { pass, expiresAt } = await issue(store, 999);
    expect(pass).toMatch(/^wpb_/);
    expect(rows[0]?.passHash).toHaveLength(64);
    expect(JSON.stringify(rows)).not.toContain(pass);
    expect(expiresAt.getTime() - T0.getTime()).toBe(120 * 60_000);
  });
});

describe("builder pass expiry", () => {
  it("is valid before expiry and expired at/after it", async () => {
    const { store, rows } = memoryStore();
    await issue(store, 120);
    const rec = rows[0]!;
    expect(passStatus(rec, minutes(119))).toBe("valid");
    expect(passStatus(rec, minutes(120))).toBe("expired");
  });
  it("cannot be redeemed after expiry", async () => {
    const { store } = memoryStore();
    const { pass } = await issue(store, 120);
    expect(await rejection(redeemPass(store, pass, ORIGIN, minutes(121)))).toBe("expired");
  });
  it("access tokens stop working at expiry", async () => {
    const { store } = memoryStore();
    const { pass } = await issue(store, 120);
    const { accessToken } = await redeemPass(store, pass, ORIGIN, minutes(1));
    await expect(
      authenticateAccessToken(store, accessToken, ORIGIN, minutes(119)),
    ).resolves.toMatchObject({ projectId: "p1" });
    expect(await rejection(authenticateAccessToken(store, accessToken, ORIGIN, minutes(120)))).toBe(
      "expired",
    );
  });
});

describe("builder pass single-use", () => {
  it("redeems once; a second redemption fails", async () => {
    const { store } = memoryStore();
    const { pass } = await issue(store);
    const first = await redeemPass(store, pass, ORIGIN, minutes(1));
    expect(first.accessToken).toMatch(/^wpa_/);
    expect(await rejection(redeemPass(store, pass, ORIGIN, minutes(2)))).toBe("used");
  });
  it("only one of two concurrent redemptions wins", async () => {
    const { store } = memoryStore();
    const { pass } = await issue(store);
    const results = await Promise.allSettled([
      redeemPass(store, pass, ORIGIN, minutes(1)),
      redeemPass(store, pass, ORIGIN, minutes(1)),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });
  it("revoked passes and tokens are rejected", async () => {
    const { store, rows } = memoryStore();
    const { pass } = await issue(store);
    const { accessToken } = await redeemPass(store, pass, ORIGIN, minutes(1));
    rows[0]!.revokedAt = minutes(2);
    expect(await rejection(authenticateAccessToken(store, accessToken, ORIGIN, minutes(3)))).toBe(
      "revoked",
    );
  });
  it("rejects unknown passes, malformed tokens and wrong origins", async () => {
    const { store } = memoryStore();
    const { pass } = await issue(store);
    expect(await rejection(redeemPass(store, `wpb_${"x".repeat(43)}`, ORIGIN, minutes(1)))).toBe(
      "unknown",
    );
    expect(await rejection(redeemPass(store, pass, "https://evil.example.com", minutes(1)))).toBe(
      "origin_mismatch",
    );
    expect(await rejection(redeemPass(store, pass, null, minutes(1)))).toBe("origin_mismatch");
    // A failed origin check does not burn the pass.
    const { accessToken } = await redeemPass(store, pass, ORIGIN, minutes(1));
    expect(
      await rejection(
        authenticateAccessToken(store, accessToken, "https://evil.example.com", minutes(2)),
      ),
    ).toBe("origin_mismatch");
    expect(await rejection(authenticateAccessToken(store, "not-a-token", ORIGIN, minutes(2)))).toBe(
      "unknown",
    );
    expect(await rejection(authenticateAccessToken(store, null, ORIGIN, minutes(2)))).toBe(
      "unknown",
    );
  });
});

describe("buildLaunchUrl", () => {
  const opts = {
    publicKey: "pk_demoShop0000000000000000",
    pass: "wpb_SECRET",
    builderParam: "tour_builder",
    previewParam: "tour_preview",
    hashParam: "ptb_token",
  };
  it("puts the pass in the fragment, never the query string", () => {
    const url = new URL(
      buildLaunchUrl("http://localhost:5173/products?ref=x#old", {
        ...opts,
        mode: "BUILD",
        tourId: "t1",
      }),
    );
    expect(url.searchParams.get("tour_builder")).toBe(opts.publicKey);
    expect(url.search).not.toContain("wpb_");
    expect(url.hash).toBe("#ptb_token=wpb_SECRET&tour=t1");
    expect(url.searchParams.get("ref")).toBe("x");
  });
  it("adds the preview parameter in preview mode", () => {
    const url = new URL(
      buildLaunchUrl("http://localhost:5173/", { ...opts, mode: "PREVIEW", tourId: "t9" }),
    );
    expect(url.searchParams.get("tour_preview")).toBe("t9");
  });
});
