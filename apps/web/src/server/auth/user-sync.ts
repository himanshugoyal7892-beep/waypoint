import type { AuthIdentity, CurrentUser } from "./types";

/** Minimal slice of the Prisma client used here, so the logic can be unit-tested with a fake. */
export interface UserStore {
  user: {
    upsert(args: {
      where: { clerkUserId: string };
      update: { email?: string; name?: string | null };
      create: { clerkUserId: string; email: string; name: string | null };
      select: { id: true; clerkUserId: true; email: true; name: true };
    }): Promise<{ id: string; clerkUserId: string; email: string; name: string | null }>;
  };
}

/**
 * Lazy user synchronisation: the local User row is created on the first authenticated
 * request and its email/name refreshed on later requests. No webhook is needed for the MVP.
 * Deleting a Clerk user does not delete local data yet (see verification-status.md).
 */
export async function syncUser(store: UserStore, identity: AuthIdentity): Promise<CurrentUser> {
  const row = await store.user.upsert({
    where: { clerkUserId: identity.externalId },
    update: { email: identity.email, name: identity.name },
    create: { clerkUserId: identity.externalId, email: identity.email, name: identity.name },
    select: { id: true, clerkUserId: true, email: true, name: true },
  });
  return { id: row.id, externalId: row.clerkUserId, email: row.email, name: row.name };
}
