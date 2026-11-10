import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import type { AuthIdentity, AuthProvider } from "./types";

/** The only module that imports Clerk's server SDK. */
export const clerkProvider: AuthProvider = {
  async getIdentity(): Promise<AuthIdentity | null> {
    const { userId } = await auth();
    if (!userId) return null;
    const user = await currentUser();
    if (!user) return null;
    const primary =
      user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId) ??
      user.emailAddresses[0];
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || null;
    return { externalId: userId, email: primary?.emailAddress ?? "", name };
  },
};
