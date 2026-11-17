import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";

beforeAll(() => {
  process.env.DATABASE_URL ??= "postgresql://x:y@localhost:5432/z";
  process.env.ANTHROPIC_API_KEY = "test-key-not-real";
  process.env.AI_MODEL = "claude-test-model";
});
afterEach(() => vi.unstubAllGlobals());

const call = {
  system: "sys",
  prompt: "hello",
  toolName: "tip_text",
  toolDescription: "d",
  inputSchema: { type: "object" },
  parse: z.object({ title: z.string() }),
};

describe("runTool", () => {
  it("forces the tool, sends the key only in the header, and validates the answer", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        content: [
          { type: "text", text: "ignored" },
          { type: "tool_use", name: "tip_text", input: { title: "Hi" } },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { runTool } = await import("@/server/ai/claude");
    expect(await runTool(call)).toEqual({ title: "Hi" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    const headers = init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("test-key-not-real");
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe("claude-test-model");
    expect(body.tool_choice).toEqual({ type: "tool", name: "tip_text" });
    expect(String(init.body)).not.toContain("test-key-not-real");
  });

  it("maps a rejected key, a busy service and a malformed answer to AI_FAILED", async () => {
    const { runTool } = await import("@/server/ai/claude");
    for (const res of [
      new Response("no", { status: 401 }),
      new Response("busy", { status: 429 }),
      Response.json({ content: [{ type: "tool_use", name: "tip_text", input: { nope: 1 } }] }),
    ]) {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => res),
      );
      await expect(runTool(call)).rejects.toMatchObject({ code: "AI_FAILED" });
    }
  });
});
