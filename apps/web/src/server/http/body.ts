import "server-only";
import type { ZodType, ZodTypeDef } from "zod";
import { ApiError } from "./errors";

async function readLimited(req: Request, maxBytes: number): Promise<string> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > maxBytes)
    throw new ApiError(413, "PAYLOAD_TOO_LARGE", `Request body exceeds ${maxBytes} bytes.`);
  const text = await req.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes)
    throw new ApiError(413, "PAYLOAD_TOO_LARGE", `Request body exceeds ${maxBytes} bytes.`);
  return text;
}

function parseJson(text: string): unknown {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, "VALIDATION_ERROR", "Request body is not valid JSON.");
  }
}

/** Admin bodies: must be application/json (blocks form-based CSRF), size-capped, validated. */
export async function readJsonBody<T>(
  req: Request,
  schema: ZodType<T, ZodTypeDef, unknown>,
  maxBytes: number,
): Promise<T> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("application/json"))
    throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Send the request body as application/json.");
  return schema.parse(parseJson(await readLimited(req, maxBytes)));
}

/**
 * Public SDK bodies: accept text/plain JSON (sendBeacon without CORS preflight, decision 15)
 * or application/json.
 */
export async function readBeaconBody<T>(
  req: Request,
  schema: ZodType<T, ZodTypeDef, unknown>,
  maxBytes: number,
): Promise<T> {
  const type = (req.headers.get("content-type") ?? "").toLowerCase();
  if (type && !type.startsWith("text/plain") && !type.startsWith("application/json"))
    throw new ApiError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Send the body as text/plain or application/json.",
    );
  return schema.parse(parseJson(await readLimited(req, maxBytes)));
}
