import "server-only";
import { z } from "zod";

/**
 * Server environment, validated once on first use (not at import time, so `next build`
 * can run without a database). Never import this from client components: `server-only`
 * makes that a build error.
 */
const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().url("DATABASE_URL must be a postgres connection URL."),
    DIRECT_URL: z.string().url().optional(),
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
    NEXT_PUBLIC_SDK_URL: z.string().url().default("http://localhost:3000/sdk/product-tour.js"),
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
    CLERK_SECRET_KEY: z.string().optional(),
    RATE_LIMIT_DRIVER: z.enum(["memory", "upstash"]).default("memory"),
    UPSTASH_REDIS_REST_URL: z.string().url().optional().or(z.literal("")),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
    BUILDER_PASS_TTL_MINUTES: z.coerce.number().int().min(5).max(120).default(120),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production") {
      if (!env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !env.CLERK_SECRET_KEY)
        ctx.addIssue({
          code: "custom",
          path: ["CLERK_SECRET_KEY"],
          message: "Clerk keys are required in production.",
        });
      if (env.RATE_LIMIT_DRIVER !== "upstash")
        ctx.addIssue({
          code: "custom",
          path: ["RATE_LIMIT_DRIVER"],
          message:
            "Use RATE_LIMIT_DRIVER=upstash in production; the memory limiter is per-instance.",
        });
    }
    if (
      env.RATE_LIMIT_DRIVER === "upstash" &&
      (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN)
    )
      ctx.addIssue({
        code: "custom",
        path: ["UPSTASH_REDIS_REST_URL"],
        message: "Upstash URL and token are required.",
      });
  });

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | undefined;

export function env(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    // Names only. Never print values, which may be secrets.
    const problems = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid server environment: ${problems}`);
  }
  cached = parsed.data;
  return cached;
}
