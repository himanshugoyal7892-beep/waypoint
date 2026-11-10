import { describe, expect, it } from "vitest";
import { syncUser, type UserStore } from "@/server/auth/user-sync";

describe("syncUser", () => {
  it("upserts by external id and maps to CurrentUser", async () => {
    let captured: Parameters<UserStore["user"]["upsert"]>[0] | undefined;
    const store: UserStore = {
      user: {
        upsert: async (args) => {
          captured = args;
          return {
            id: "u_1",
            clerkUserId: args.where.clerkUserId,
            email: args.create.email,
            name: args.create.name,
          };
        },
      },
    };
    const user = await syncUser(store, {
      externalId: "user_abc",
      email: "a@example.com",
      name: "Ada",
    });
    expect(user).toEqual({
      id: "u_1",
      externalId: "user_abc",
      email: "a@example.com",
      name: "Ada",
    });
    expect(captured?.where).toEqual({ clerkUserId: "user_abc" });
    expect(captured?.update).toEqual({ email: "a@example.com", name: "Ada" });
  });
});
