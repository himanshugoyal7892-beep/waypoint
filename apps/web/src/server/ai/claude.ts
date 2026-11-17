import "server-only";
import type { ZodType, ZodTypeDef } from "zod";
import { env } from "../env";
import { ApiError } from "../http/errors";

const TIMEOUT_MS = 50_000;

export interface ToolCall<T> {
  system: string;
  prompt: string;
  toolName: string;
  toolDescription: string;
  /** JSON schema of the tool input: the shape of the answer. */
  inputSchema: Record<string, unknown>;
  /** Validates the answer before anything uses it. */
  parse: ZodType<T, ZodTypeDef, unknown>;
  maxTokens?: number;
}

export type ToolRunner = <T>(call: ToolCall<T>) => Promise<T>;

export const aiNotConfigured = () =>
  new ApiError(
    503,
    "AI_NOT_CONFIGURED",
    "AI features aren't switched on yet. Add an ANTHROPIC_API_KEY in Vercel → Settings → Environment Variables, then redeploy.",
  );
const aiFailed = (why = "The AI service didn't respond. Try again in a moment.") =>
  new ApiError(502, "AI_FAILED", why);

export function aiConfigured() {
  return Boolean(env().ANTHROPIC_API_KEY);
}

/**
 * Asks Claude for a structured answer by forcing one tool call, then validates it. The key never
 * leaves the server. Only page text, selectors and tour copy are sent: no visitor data.
 */
export const runTool: ToolRunner = async <T>(call: ToolCall<T>): Promise<T> => {
  const { ANTHROPIC_API_KEY: key, AI_MODEL: model, AI_API_URL: url } = env();
  if (!key) throw aiNotConfigured();

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: call.maxTokens ?? 2000,
        system: call.system,
        messages: [{ role: "user", content: call.prompt }],
        tools: [
          {
            name: call.toolName,
            description: call.toolDescription,
            input_schema: call.inputSchema,
          },
        ],
        tool_choice: { type: "tool", name: call.toolName },
      }),
    });
  } catch {
    throw aiFailed(ctrl.signal.aborted ? "The AI took too long. Try again." : undefined);
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401 || res.status === 403)
    throw aiFailed("The AI key was rejected. Check ANTHROPIC_API_KEY in Vercel.");
  if (res.status === 429) throw aiFailed("The AI service is busy. Try again in a minute.");
  if (!res.ok) throw aiFailed();

  const body = (await res.json().catch(() => null)) as {
    content?: { type: string; name?: string; input?: unknown }[];
  } | null;
  const use = body?.content?.find((c) => c.type === "tool_use" && c.name === call.toolName);
  const parsed = call.parse.safeParse(use?.input);
  if (!parsed.success) throw aiFailed("The AI answer wasn't usable. Try again.");
  return parsed.data;
};
