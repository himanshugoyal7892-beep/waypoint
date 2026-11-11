# Waypoint: no-code product tours (MVP)

> "Waypoint" is a placeholder name, set in [`packages/shared/src/product-config.ts`](packages/shared/src/product-config.ts).

Waypoint lets a product team create guided tours on its own website. You install one script
tag, then build multi-step tooltip tours in a dashboard and publish them without code changes.

| Phase | Scope                                                          | Status                                                                                      |
| ----- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1     | Architecture & plan                                            | ✅ [docs/phase-1-architecture.md](docs/phase-1-architecture.md)                             |
| **2** | **Foundation, auth, admin dashboard, admin + public APIs**     | ✅ Implemented and verified: see [docs/verification-status.md](docs/verification-status.md) |
| **3** | **Embeddable SDK (overlay, tooltip, navigation, SPA support)** | ✅ Implemented and verified (unit tests + real Chrome)                                      |
| **4** | **Visual builder, element picker, preview**                    | ✅ Implemented and verified (unit tests + real Chrome on a live third-party site)           |
| 5     | Analytics page, demo shop, E2E tests                           | 🟡 Analytics page done; demo shop not started                                               |
| 6     | Deployment, docs, roadmap                                      | Not started                                                                                 |

## Repository layout

```text
apps/web            Next.js 15 dashboard + all APIs (admin, builder, public SDK)
  prisma/           schema, migrations, seed
  src/app           pages (App Router) and route handlers under api/
  src/server        services, auth adapter, ownership, rate limiting, builder pass, http helpers
  src/components    shadcn-style UI primitives and dashboard components
  tests/unit        Vitest unit tests
packages/sdk        Embeddable tour script (vanilla TS → apps/web/public/sdk/product-tour.js, 13.5 KB gzip)
packages/shared     Zod schemas, enums, limits, URL/origin/ordering/publish rules (used by API, UI and SDK)
packages/config     shared tsconfig and ESLint flat config
scripts/            verify.sh (full verification), offline-check.sh (no-network subset)
docs/               architecture, schema decisions, verification status
```

## Prerequisites

- Node.js ≥ 20.18 and pnpm 10 (`corepack enable`)
- Docker (for local PostgreSQL), or any PostgreSQL 16 reachable via `DATABASE_URL`
- A Clerk application, optional for local development (see below)

## Local setup

```bash
pnpm install
cp .env.example apps/web/.env.local   # read by Next.js
cp .env.example apps/web/.env         # read by the Prisma CLI
pnpm db:up                            # starts Postgres on :5432
pnpm db:migrate:deploy                # applies prisma/migrations
pnpm db:seed                          # demo user, "Demo Shop" project, 5-step draft tour
pnpm dev                              # http://localhost:3000
```

Or run everything, including lint, type-check, tests and build, with `bash scripts/verify.sh`.

### Authentication (Clerk)

- **Without keys (development):** leave `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` empty. Clerk's keyless mode creates a temporary development instance on first run and prints a claim link.
- **With keys:** create an application at clerk.com and put its publishable key and secret key in `apps/web/.env.local`. The secret key is server-only and never sent to the browser.
- **Seeing the seed data:** sign in once, copy your Clerk user id (`user_…`) into `SEED_CLERK_USER_ID`, then re-run `pnpm db:seed`. The demo project becomes yours.

Clerk is used in exactly one place, `apps/web/src/server/auth/clerk-provider.ts`. To swap providers, implement the `AuthProvider` interface in `src/server/auth/types.ts` and change one line in `src/server/auth/index.ts`. Users are synced lazily: a local `User` row is upserted on the first authenticated request.

## Scripts

| Command                                                             | What it does                                         |
| ------------------------------------------------------------------- | ---------------------------------------------------- |
| `pnpm dev`                                                          | Dashboard + API on port 3000                         |
| `pnpm lint` / `pnpm typecheck` / `pnpm test`                        | ESLint, `tsc --noEmit`, Vitest in every package      |
| `pnpm format` / `pnpm format:check`                                 | Prettier                                             |
| `pnpm db:up` / `db:down`                                            | Start or stop the Postgres container                 |
| `pnpm db:generate` / `db:migrate` / `db:migrate:deploy` / `db:seed` | Prisma                                               |
| `bash scripts/verify.sh`                                            | Full verification pipeline                           |
| `bash scripts/offline-check.sh`                                     | The subset that runs without installing dependencies |

## Environment variables

See [`.env.example`](.env.example). Only `NEXT_PUBLIC_*` variables reach the browser.

| Variable                                             | Exposure | Purpose                                                                                 |
| ---------------------------------------------------- | -------- | --------------------------------------------------------------------------------------- |
| `DATABASE_URL`, `DIRECT_URL`                         | server   | Postgres (pooled / direct for migrations)                                               |
| `NEXT_PUBLIC_APP_URL`                                | public   | Dashboard origin (CSRF origin check, CSP hints)                                         |
| `NEXT_PUBLIC_SDK_URL`                                | public   | SDK URL used in the install snippet                                                     |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`                  | public   | Clerk                                                                                   |
| `CLERK_SECRET_KEY`                                   | server   | Clerk                                                                                   |
| `RATE_LIMIT_DRIVER`                                  | server   | `memory` (dev only) or `upstash` (required in production)                               |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | server   | Distributed rate limiting                                                               |
| `ALLOW_MEMORY_RATE_LIMIT_IN_PRODUCTION`              | server   | `true` lets a demo/staging deployment run without Upstash (weaker, per-instance limits) |
| `BUILDER_PASS_TTL_MINUTES`                           | server   | Builder pass lifetime (5–120, default 120)                                              |
| `SEED_CLERK_USER_ID`, `SEED_USER_EMAIL`              | server   | Seed owner                                                                              |

## API overview

All errors use `{ "error": { "code", "message", "details?" } }`. Admin resources you don't own return **404**.

**Admin** (Clerk session, same-origin, JSON only), under `/api/admin/v1`:

| Method                                 | Path                                                                                    |
| -------------------------------------- | --------------------------------------------------------------------------------------- |
| GET, POST                              | `/projects`                                                                             |
| GET, PATCH, DELETE                     | `/projects/{projectId}`                                                                 |
| GET                                    | `/projects/{projectId}/install`                                                         |
| GET (`?status=`), POST                 | `/projects/{projectId}/tours`                                                           |
| GET (+ `publishIssues`), PATCH, DELETE | `/tours/{tourId}`                                                                       |
| POST                                   | `/tours/{tourId}/publish` · `/unpublish` · `/archive` · `/restore`                      |
| GET, POST                              | `/tours/{tourId}/steps`                                                                 |
| PUT `{ stepIds }`                      | `/tours/{tourId}/steps/order`                                                           |
| GET, PATCH, DELETE                     | `/steps/{stepId}`                                                                       |
| POST `{ mode, tourId?, targetUrl }`    | `/projects/{projectId}/builder-sessions` → `launchUrl` with the pass in the `#fragment` |
| DELETE                                 | `/builder-sessions/{sessionId}` (revoke)                                                |

**Public SDK** (no cookies, origin must be in the project's allowed origins, rate-limited):

| Method                                               | Path                                                           |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| GET                                                  | `/api/public/v1/projects/{publicKey}/tours?path=/current/path` |
| POST (`text/plain` JSON batch, ≤ 20 events, ≤ 32 KB) | `/api/public/v1/events` → `202 { accepted, dropped }`          |

**Builder** (bearer token from a redeemed pass, bound to one origin):

| Method          | Path                                                                        |
| --------------- | --------------------------------------------------------------------------- |
| POST `{ pass }` | `/api/builder/v1/session` → redeems the single-use pass for an access token |
| GET             | `/api/builder/v1/session` → project + tours                                 |

See [docs/phase-2-schema-decisions.md](docs/phase-2-schema-decisions.md) for how these differ from the Phase 1 contract.

## The tour script (SDK)

Customers add the snippet from the Install page. The script:

- loads published tours for the current page, auto-starts **AUTO** tours once per visitor, and continues tours across pages and single-page-app route changes;
- highlights the target, dims the page (the page stays scrollable and clickable), and positions a tooltip with Next / Back / Skip / Finish / close, a step counter, keyboard support (Tab stays inside, Escape closes) and focus restore;
- waits up to 5 s for late-rendered elements, records `element_not_found` and skips ahead when an element is missing;
- sends analytics in batches (`sendBeacon` with `text/plain` on page exit), with origin + path only;
- renders everything in a Shadow DOM so host CSS can't affect it, and removes every node and listener when the tour ends.

JavaScript API: `ProductTour.start(tourId)`, `ProductTour.stop()`, `ProductTour.reset()`, `ProductTour.version`.

**Practice page:** `/sdk/playground.html?key=YOUR_PUBLIC_KEY` on the dashboard's own domain (add that domain to the project's allowed origins).

Build with `pnpm --filter @waypoint/sdk build` (enforces the 25 KB gzip budget and copies the bundle into `apps/web/public/sdk/`). Real-browser check: `pnpm --filter @waypoint/sdk browser-check` (needs Chrome, the API on :3000 and the published seed tour).

## Visual builder

Create steps by clicking elements on the real website:

1. Tour page → **Open visual builder** → copy the one-time builder code (valid 2 hours, one website).
2. On the website, click the **Waypoint builder** bookmark (get it from `/sdk/preview.html?key=YOUR_KEY`), or open the direct link if the snippet is installed.
3. Paste the code → **+ Add step** → click an element → write the text → **Save step**. Reorder, preview (not recorded in analytics) and publish from the panel.

The builder is a separate bundle (`product-tour-builder.js`, ~21 KB gzip) loaded only in builder mode, so visitors never download it. Selectors are generated in this order: `data-tour-id` → stable id → `data-testid`-style attributes → accessible attributes → stable classes → anchored path → positional path, with a Stable / OK / Fragile rating. Hidden duplicates (e.g. mobile menus) are tolerated: the runtime uses the first _visible_ match.

Real-site check: `PASS=wpb_… pnpm --filter @waypoint/sdk builder-check` (needs Chrome and the API on :3000).

## Analytics

Tour page → **Analytics**: visitors who started, starts, completions and completion rate, skips and skip rate, element-not-found count, and drop-off by step, for the last 7, 30 or 90 days. API: `GET /api/admin/v1/tours/{tourId}/analytics?days=30`.

## Security notes

- Tour content is plain text only and is rendered as text, never HTML. ESLint bans HTML sinks.
- Builder passes are 256-bit, stored as SHA-256 hashes, valid for up to 2 hours, single-use, bound to one allowed origin, delivered in the URL fragment and never logged.
- Tracked URLs keep **origin + pathname only**. No page content, form values or IPs are stored.
- Admin mutations require `application/json` and a same-origin `Origin` header (CSRF).
- Production refuses to start without Clerk keys or with the in-memory rate limiter.

## Known limitations (Phase 2)

- Edits to a published tour go live immediately. There are no versioned drafts of published tours.
- Each project has a single owner (no teams or roles). Deleting a Clerk user doesn't delete local data (no webhook yet).
- Allowed origins are exact matches (no wildcard subdomains).
- `next build` needs real Clerk keys (`scripts/verify.sh` uses a placeholder key only to verify the build).
