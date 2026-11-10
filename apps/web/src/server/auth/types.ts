/**
 * Provider-neutral authentication contract. Everything outside src/server/auth depends on
 * these types only, so Clerk can be swapped for another provider by adding an adapter.
 */
export interface AuthIdentity {
  /** Stable id from the identity provider (Clerk: "user_…"). Stored as User.clerkUserId. */
  externalId: string;
  email: string;
  name: string | null;
}

export interface AuthProvider {
  /** The signed-in identity for the current request, or null if signed out. */
  getIdentity(): Promise<AuthIdentity | null>;
}

/** The local user row that admin code works with. */
export interface CurrentUser {
  id: string;
  externalId: string;
  email: string;
  name: string | null;
}
