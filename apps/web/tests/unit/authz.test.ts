import { describe, expect, it } from "vitest";
import {
  assertProjectOwner,
  assertStepOwner,
  assertTourOwner,
  type OwnershipStore,
} from "@/server/authz";
import { ApiError } from "@/server/http/errors";

// In-memory fake that evaluates the same `where` filters Prisma would.
const projects = [
  { id: "p_alice", createdById: "u_alice" },
  { id: "p_bob", createdById: "u_bob" },
];
const tours = [
  { id: "t_alice", projectId: "p_alice" },
  { id: "t_bob", projectId: "p_bob" },
];
const steps = [
  { id: "s_alice", tourId: "t_alice" },
  { id: "s_bob", tourId: "t_bob" },
];
const ownerOfProject = (projectId: string) => projects.find((p) => p.id === projectId)?.createdById;
const ownerOfTour = (tourId: string) =>
  ownerOfProject(tours.find((t) => t.id === tourId)?.projectId ?? "");

const calls: unknown[] = [];
const store: OwnershipStore = {
  project: {
    findFirst: async ({ where }) => {
      calls.push(where);
      const p = projects.find((x) => x.id === where.id && x.createdById === where.createdById);
      return p ? { id: p.id } : null;
    },
  },
  tour: {
    findFirst: async ({ where }) => {
      calls.push(where);
      const t = tours.find(
        (x) => x.id === where.id && ownerOfProject(x.projectId) === where.project.createdById,
      );
      return t ? { id: t.id, projectId: t.projectId } : null;
    },
  },
  tourStep: {
    findFirst: async ({ where }) => {
      calls.push(where);
      const s = steps.find(
        (x) => x.id === where.id && ownerOfTour(x.tourId) === where.tour.project.createdById,
      );
      return s ? { id: s.id, tourId: s.tourId } : null;
    },
  },
};

async function expectNotFound(p: Promise<unknown>) {
  const err = await p.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(ApiError);
  expect((err as ApiError).status).toBe(404);
  expect((err as ApiError).code).toBe("NOT_FOUND");
}

describe("project ownership", () => {
  it("allows the owner", async () => {
    await expect(assertProjectOwner(store, "u_alice", "p_alice")).resolves.toEqual({
      id: "p_alice",
    });
  });
  it("returns 404 (not 403) for another user's project so ids can't be enumerated", async () => {
    await expectNotFound(assertProjectOwner(store, "u_alice", "p_bob"));
  });
  it("returns 404 for missing and malformed ids without querying", async () => {
    await expectNotFound(assertProjectOwner(store, "u_alice", "p_missing"));
    const before = calls.length;
    await expectNotFound(assertProjectOwner(store, "u_alice", "../etc"));
    await expectNotFound(assertProjectOwner(store, "u_alice", ""));
    expect(calls.length).toBe(before);
  });
  it("always filters by owner in the query", async () => {
    await assertProjectOwner(store, "u_bob", "p_bob");
    expect(calls.at(-1)).toEqual({ id: "p_bob", createdById: "u_bob" });
  });
});

describe("tour ownership", () => {
  it("allows the owner and returns the project id", async () => {
    await expect(assertTourOwner(store, "u_alice", "t_alice")).resolves.toEqual({
      id: "t_alice",
      projectId: "p_alice",
    });
  });
  it("denies other users", async () => {
    await expectNotFound(assertTourOwner(store, "u_bob", "t_alice"));
  });
  it("filters through the project owner", async () => {
    await assertTourOwner(store, "u_bob", "t_bob");
    expect(calls.at(-1)).toEqual({ id: "t_bob", project: { createdById: "u_bob" } });
  });
});

describe("step ownership", () => {
  it("allows the owner and returns the tour id", async () => {
    await expect(assertStepOwner(store, "u_bob", "s_bob")).resolves.toEqual({
      id: "s_bob",
      tourId: "t_bob",
    });
  });
  it("denies other users", async () => {
    await expectNotFound(assertStepOwner(store, "u_alice", "s_bob"));
  });
});
