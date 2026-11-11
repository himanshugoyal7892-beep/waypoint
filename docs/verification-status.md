# Verification status

## Phase 4: visual builder + analytics page. VERIFIED

_Verified: 2026-11-11._

| Check                                                      | Result                                                                                                               |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `bash scripts/verify.sh`                                   | PASS: lint, typecheck, **150 tests** (SDK 59, shared 53, web 38), format, bundle budgets, `next build`               |
| Bundles                                                    | Visitor script **13.9 KB** gzip (budget 25 KB). Builder **21.0 KB** gzip (budget 45 KB), loaded only in builder mode |
| Builder on live **redingtonpartner.com** (`builder-check`) | **15/15 PASS**                                                                                                       |
| Visitor tour regression (`browser-check`)                  | **15/15 PASS**                                                                                                       |
| Analytics SQL on real recorded events                      | PASS (grouped counts and distinct visitors per step)                                                                 |

The builder checks on the live site:

- the panel opens and rejects a malformed code;
- a valid code connects and lists tours;
- clicking the search box gives `#search` (rated OK, hidden mobile copy noted);
- clicking a nav link doesn't navigate and yields `a[href="/brands"]`;
- steps save, and an empty title/description shows a validation error;
- reorder, preview (real runtime, no analytics), stop preview and publish all work;
- clicking the bookmark during page start-up still opens the builder after a reload;
- Waypoint causes no page errors. The site logs its own React #418 hydration errors with or without Waypoint.

**Found and fixed on the real site:**

1. Clicking the bookmark while the site was starting up let the site's framework remove our UI. Tooltips and the builder now re-attach (limited retries).
2. The site has hidden duplicate elements (mobile header). The runtime now uses the first _visible_ match, and the generator accepts selectors unique among visible elements.
3. A long selector stretched the panel sideways, clipping its text.

**Not yet verified:**

- The dashboard pages for the builder code and analytics in a signed-in browser. They type-check and build, but need Clerk sign-in to view, so check them manually.
- Builder on Safari and Firefox.
- Pages inside the Redington partner login (needs your account).

---

## Phase 3: tour script (SDK). VERIFIED

_Verified: 2026-11-10._

| Check                                                                           | Result                                                                                               |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `bash scripts/verify.sh` (all packages)                                         | PASS: lint, typecheck, **128 tests** (SDK 39, shared 53, web 36), format, bundle check, `next build` |
| Bundle size                                                                     | **13.5 KB gzipped** (34.4 KB minified), budget 25 KB                                                 |
| No HTML sinks in the bundle                                                     | PASS (checked in the built file and by ESLint)                                                       |
| Real Chrome end-to-end (`pnpm --filter @waypoint/sdk browser-check`), 15 checks | **15/15 PASS**                                                                                       |

Real-browser checks run against a three-page test shop with deliberately hostile global CSS:

- auto-start on a matching page
- host CSS doesn't leak into the tooltip
- focus moves into the tooltip
- off-screen targets are scrolled into view
- the page still scrolls during a tour
- the tooltip follows its target on scroll
- cross-page navigation resumes the right step
- Back
- step 5 on a third page
- Finish removes every SDK node
- a completed tour doesn't restart
- Tab stays inside the tooltip
- Escape closes and restores focus
- an SPA `pushState` route change advances the tour
- no page errors

Analytics from the run were stored with origin + path only, covering every event type the run produced: started, viewed, next, back, skipped, completed.

**Fixed during verification:**

- The highlight animated in from off-screen. It now appears instantly in place, which a screenshot review caught.
- The tours endpoint now accepts browser same-origin requests that carry no `Origin` header (`Sec-Fetch-Site: same-origin`), so the practice page on the dashboard's own domain works.
- Lint now ignores the built bundle in `public/sdk`.

**Not yet verified:**

- Safari and Firefox (only Chrome tested)
- Mobile screen sizes, which are out of MVP scope
- Screen-reader announcement quality (ARIA roles and labels are in place and asserted in tests)
- The `element_not_found` path in a real browser (covered by unit tests)

---

# Phase 2

**Overall: VERIFIED.** `bash scripts/verify.sh` passes end to end with real dependencies,
a real PostgreSQL 16 database, ESLint, TypeScript, Vitest and a Next.js production build.
A runtime smoke test of the public, admin and builder APIs also passed.

_Verified: 2026-11-10 (network access became available in the same session)._

## 1. What was implemented

| Area                                                                                                                        | Location                                                                       |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Monorepo (pnpm + Turborepo), shared TS/ESLint config, Prettier, Docker Compose, `.env.example`, `pnpm-lock.yaml`            | root, `packages/config`                                                        |
| Central product config (`PRODUCT.name = "Waypoint"`)                                                                        | `packages/shared/src/product-config.ts`                                        |
| Server env validation (lazy, names-only error messages, production guards)                                                  | `apps/web/src/server/env.ts`                                                   |
| Prisma schema, initial migration, idempotent seed (user, project, 5-step draft tour)                                        | `apps/web/prisma/`                                                             |
| Auth adapter (provider-neutral interface, Clerk adapter, lazy user sync), middleware, sign-in/up pages                      | `apps/web/src/server/auth/`, `src/middleware.ts`, `src/app/sign-*`             |
| Ownership checks (owner filter inside the query, 404 for foreign ids)                                                       | `src/server/authz.ts`, `src/server/ownership.ts`                               |
| Admin APIs: projects, tours, steps (CRUD + reorder), publish/unpublish/archive/restore, install, builder pass create/revoke | `src/app/api/admin/v1/**`, `src/server/services/**`                            |
| Publishing validation with actionable issues                                                                                | `packages/shared/src/publish-rules.ts`                                         |
| Public SDK APIs: eligible tours, analytics batches (text/plain), origin allow-list, CORS, rate limiting                     | `src/app/api/public/v1/**`, `src/server/public/**`, `src/server/rate-limit/**` |
| Builder pass: issue (hash only, fragment delivery), single-use redeem, bearer validation, revoke                            | `src/server/builder-pass/**`, `src/app/api/builder/v1/session`                 |
| Dashboard pages 1–10 with validation, empty/loading/error states, delete confirmations                                      | `src/app/dashboard/**`, `src/components/**`                                    |

## 2. `bash scripts/verify.sh` results (executed)

Run with `SKIP_DOCKER=1` against a local PostgreSQL 16 server (the build workspace has no Docker daemon). `docker compose up -d db` itself has not been exercised.

| Step                                                   | Result                                                                                  |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `pnpm install` (lockfile created)                      | PASS                                                                                    |
| `prisma generate`                                      | PASS                                                                                    |
| `prisma migrate deploy`                                | PASS                                                                                    |
| `prisma migrate diff --exit-code` (schema vs database) | PASS: "No difference detected" (the hand-written migration matches the schema)          |
| `prisma db seed`                                       | PASS                                                                                    |
| `pnpm lint` (ESLint, both packages)                    | PASS                                                                                    |
| `pnpm typecheck` (`tsc --noEmit`, both packages)       | PASS, 0 errors                                                                          |
| `pnpm test` (Vitest 3.2.4)                             | PASS: **87 tests in 13 files** (shared 53, web 34)                                      |
| `pnpm format:check`                                    | PASS                                                                                    |
| `next build`                                           | PASS: 29 routes. Built with a placeholder Clerk key because none is configured (see §5) |

## 3. Runtime smoke test (dev server + real database)

| #   | Check                                                       | Result                                                                                       |
| --- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | Published tour from an allowed origin                       | 200, 1 tour / 5 steps, only SDK fields, `Access-Control-Allow-Origin` echoed, 60 s CDN cache |
| 2   | Same tour requested from a later page (`/cart`), for resume | Returned                                                                                     |
| 3–4 | Unknown origin / missing Origin header                      | 403 `FORBIDDEN`, no CORS header                                                              |
| 5   | Unknown project key                                         | 404 `NOT_FOUND`                                                                              |
| 6   | Page with no tour                                           | `{"tours":[]}`                                                                               |
| 7   | Analytics batch as `text/plain`                             | 202, valid event stored, event for a foreign tour dropped                                    |
| 8   | Same batch resent                                           | 0 accepted (deduplicated)                                                                    |
| —   | Stored URL for an event sent with `?email=…#ptb_token=…`    | Stored as `http://localhost:5173/` (origin + path only)                                      |
| 9   | Analytics from unknown origin                               | 403                                                                                          |
| 10  | Event with extra page-content field                         | 400 `VALIDATION_ERROR`                                                                       |
| 11  | Admin API signed out                                        | 401 `UNAUTHENTICATED`                                                                        |
| 12  | Admin POST from another site                                | 403 `FORBIDDEN` (CSRF check)                                                                 |
| 13  | Bogus builder pass                                          | 401 `BUILDER_PASS_INVALID`                                                                   |
| 14  | 125 rapid tour requests from one IP                         | 120 × 200, then 5 × 429                                                                      |
| 15  | Real pass redeemed from the wrong origin                    | 401 (and the pass was not burned)                                                            |
| 16  | Real pass redeemed from its origin                          | 201 with access token, 2-hour expiry                                                         |
| 17  | Same pass redeemed again                                    | 401 (single use)                                                                             |
| 18  | Access token from its origin                                | 200, project + tours                                                                         |
| 19  | Access token from another origin                            | 401                                                                                          |
| 20  | CORS preflight for builder API                              | 204, origin + `Authorization` header allowed                                                 |
| —   | Pass stored in plain text / present in server log           | No / No                                                                                      |
| —   | Production mode with the in-memory rate limiter             | Refused (generic 500 to client, no details leaked), as designed                              |

## 4. Fixes made during verification

- `api-types.ts`: replaced an inline `import()` type with a normal type import (lint rule).
- ESLint now ignores Next's generated `next-env.d.ts`.
- `next.config.ts`: `eslint.ignoreDuringBuilds` (lint runs as its own step with the shared config).
- Version bumps for security patches and Clerk peer compatibility: **Next 15.5.4 → 15.5.29**, **React/React DOM 19.1.1 → 19.1.10**, `@next/eslint-plugin-next` → 15.5.29.
- Native build scripts allowed for `@clerk/shared`, `@tailwindcss/oxide`, `sharp`.
- `verify.sh` builds with a placeholder Clerk key when none is configured (verification only).
- One file re-formatted with the pinned Prettier version.

## 5. Not yet verified / known risks

1. **Signed-in dashboard flows in a browser.** Clerk sign-in needs real keys (or keyless mode with internet access to Clerk). Creating projects, tours and steps through the UI, the delete dialogs, keyboard reordering and responsive layout still need a manual pass once Clerk keys are configured. The admin APIs behind them type-check and their ownership/validation logic is unit-tested, but they haven't been called with a real session.
2. **Production build needs real Clerk keys.** Without `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `next build` fails while pre-rendering. This is expected.
3. **Upstash rate limiter** is untested (production requires it; the memory limiter is verified).
4. **`docker compose`** wasn't run (no Docker daemon here). Postgres 16 was run directly with the same credentials.
5. **Prisma 7 deprecation warning** for `package.json#prisma` (seed config). Harmless on Prisma 6; migrate to `prisma.config.ts` before upgrading.
6. **ESLint 9.36 deprecation notice** from the registry. Upgrade when convenient.
7. **Concurrent step inserts** may return `409 CONFLICT` for one request. Intended, but not exercised.

## 6. Commands

```bash
bash scripts/verify.sh                 # full pipeline (uses docker compose for Postgres)
SKIP_DOCKER=1 bash scripts/verify.sh   # use an existing Postgres from DATABASE_URL
SKIP_BUILD=1 bash scripts/verify.sh    # skip next build
bash scripts/offline-check.sh          # subset that runs without installing dependencies
```
