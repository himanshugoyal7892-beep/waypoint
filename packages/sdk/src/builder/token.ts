import { PRODUCT } from "@waypoint/shared/product-config";
import type { KeyValueStore } from "../storage";
import { readJson } from "../storage";
import { redeemPass } from "./api";

export interface StoredBuilderToken {
  token: string;
  expiresAt: string;
  mode: "BUILD" | "PREVIEW";
  tourId: string | null;
}

const PASS = /wpb_[A-Za-z0-9_-]{43}/;

/** Extracts a builder pass from a pasted code or a full launch link. */
export function extractPass(input: string): string | null {
  const m = PASS.exec(input.trim());
  return m ? m[0] : null;
}

/**
 * Reads the pass from the URL fragment (approved decision 14) and immediately removes it from
 * the address bar, keeping the page's own history state intact.
 */
export function takePassFromUrl(): string | null {
  if (!location.hash) return null;
  const params = new URLSearchParams(location.hash.slice(1));
  const pass = params.get(PRODUCT.sdk.builderPassHashParam);
  if (!pass) return null;
  params.delete(PRODUCT.sdk.builderPassHashParam);
  params.delete("tour");
  const rest = params.toString();
  history.replaceState(
    history.state,
    "",
    `${location.pathname}${location.search}${rest ? `#${rest}` : ""}`,
  );
  return extractPass(pass);
}

export function storedToken(session: KeyValueStore): StoredBuilderToken | null {
  const t = readJson<StoredBuilderToken>(session, "builder");
  if (!t || new Date(t.expiresAt).getTime() <= Date.now()) {
    session.remove("builder");
    return null;
  }
  return t;
}

export async function redeemAndStore(
  apiBase: string,
  pass: string,
  session: KeyValueStore,
): Promise<StoredBuilderToken> {
  const r = await redeemPass(apiBase, pass);
  const stored: StoredBuilderToken = {
    token: r.accessToken,
    expiresAt: r.expiresAt,
    mode: r.mode,
    tourId: r.tourId,
  };
  session.set("builder", JSON.stringify(stored));
  return stored;
}
