"use client";

import * as React from "react";
import type { ZodTypeAny, output } from "zod";
import { ApiClientError, zodFieldErrors } from "@/lib/api-client";

/** Picks the error for `key`, falling back to nested paths such as "allowedOrigins.2". */
export function pickError(errors: Record<string, string>, key: string): string | undefined {
  if (errors[key]) return errors[key];
  const nested = Object.keys(errors).find((k) => k.startsWith(`${key}.`));
  return nested ? errors[nested] : undefined;
}

/**
 * Shared submit flow: client-side validation with the same Zod schema the API uses, then the
 * request, then mapping of server field errors back onto the form.
 */
export function useFormSubmit<S extends ZodTypeAny>(
  schema: S,
  send: (data: output<S>) => Promise<void>,
) {
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function submit(values: unknown) {
    setFormError(null);
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error.issues));
      setFormError("Please fix the highlighted fields.");
      return false;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await send(parsed.data as output<S>);
      return true;
    } catch (err) {
      if (err instanceof ApiClientError) {
        const fe = err.fieldErrors();
        setErrors(fe);
        setFormError(err.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  return { errors, formError, submitting, submit, setFormError };
}
