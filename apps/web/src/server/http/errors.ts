import type { ApiErrorCode, ApiErrorDetail, PublishIssue } from "@waypoint/shared";

/** An error that is safe to show to the client. Anything else becomes a generic 500. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
    public readonly details?: ApiErrorDetail[] | PublishIssue[],
    public readonly headers?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const unauthenticated = () => new ApiError(401, "UNAUTHENTICATED", "Sign in to continue.");
export const forbidden = (message = "You do not have access to this resource.") =>
  new ApiError(403, "FORBIDDEN", message);
/** Used for both "does not exist" and "not yours" so ids cannot be enumerated. */
export const notFound = (what = "Resource") => new ApiError(404, "NOT_FOUND", `${what} not found.`);
export const conflict = (message: string) => new ApiError(409, "CONFLICT", message);
export const badRequest = (message: string, details?: ApiErrorDetail[]) =>
  new ApiError(400, "VALIDATION_ERROR", message, details);
