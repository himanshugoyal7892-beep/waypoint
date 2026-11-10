import "server-only";
import { Prisma } from "@prisma/client";
import type { ApiErrorBody } from "@waypoint/shared";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError } from "./errors";

export function json<T>(data: T, init: { status?: number; headers?: Record<string, string> } = {}) {
  return NextResponse.json(data, {
    status: init.status ?? 200,
    headers: { "Cache-Control": "no-store", ...init.headers },
  });
}

export function noContent(headers: Record<string, string> = {}) {
  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

export function zodDetails(err: ZodError) {
  return err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
}

/**
 * Maps any thrown value to the consistent error envelope. Internal details (SQL, stack
 * traces, Prisma messages) are never sent to the client.
 */
export function toErrorResponse(err: unknown, extraHeaders: Record<string, string> = {}) {
  const send = (status: number, body: ApiErrorBody, headers: Record<string, string> = {}) =>
    NextResponse.json(body, {
      status,
      headers: { "Cache-Control": "no-store", ...extraHeaders, ...headers },
    });

  if (err instanceof ApiError) {
    return send(
      err.status,
      {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
        },
      },
      err.headers,
    );
  }
  if (err instanceof ZodError) {
    return send(400, {
      error: {
        code: "VALIDATION_ERROR",
        message: "Some fields are invalid.",
        details: zodDetails(err),
      },
    });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002")
      return send(409, {
        error: {
          code: "CONFLICT",
          message: "This change conflicts with another edit. Reload and try again.",
        },
      });
    if (err.code === "P2025")
      return send(404, { error: { code: "NOT_FOUND", message: "Resource not found." } });
  }
  // Log the error class and Prisma code only. Request bodies may contain builder passes.
  const label =
    err instanceof Prisma.PrismaClientKnownRequestError
      ? `Prisma ${err.code}`
      : err instanceof Error
        ? err.name
        : typeof err;
  console.error(
    `[api] unhandled error: ${label}`,
    err instanceof Error && process.env.NODE_ENV !== "production" ? err.stack : "",
  );
  return send(500, {
    error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." },
  });
}
