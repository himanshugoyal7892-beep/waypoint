import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "../db";
import { unauthenticated } from "../http/errors";
import { clerkProvider } from "./clerk-provider";
import type { AuthProvider, CurrentUser } from "./types";
import { syncUser } from "./user-sync";

// Swap the provider here to replace Clerk.
const provider: AuthProvider = clerkProvider;

/** The signed-in local user, or null. Cached per request (one upsert per render/request). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const identity = await provider.getIdentity();
  if (!identity) return null;
  return syncUser({ user: { upsert: (args) => db.user.upsert(args) } }, identity);
});

/** For API routes: throws 401 when signed out. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw unauthenticated();
  return user;
}

/** For server-rendered pages: redirects to sign-in when signed out. */
export async function requirePageUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

export type { CurrentUser } from "./types";
