# Phase 2: schema and contract decisions

The Phase 1 schema (`docs/phase-1-architecture.md` §3) is implemented in
`apps/web/prisma/schema.prisma` and `prisma/migrations/20261110000000_init/migration.sql`.
Everything not listed here is unchanged from Phase 1.

## Schema changes

| #   | Change                                                                                                              | Why                                                                                                                                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | `BuilderSession.tokenHash` → **`passHash`**, plus new **`accessTokenHash`** (unique, nullable) and **`redeemedAt`** | Approved decision 13 requires a _single-use_ pass. The pass in the URL fragment is redeemed exactly once for a separate bearer access token, so a leaked launch URL (history, screen share) can't be replayed. Both values are stored only as SHA-256 hashes. |
| S2  | New `BuilderSession.mode` (`BuilderMode` enum: `BUILD`, `PREVIEW`) and `targetOrigin`                               | The pass is bound to one origin (checked at redeem and on every builder call) and one purpose.                                                                                                                                                                |
| S3  | New FK `BuilderSession.tourId → Tour.id` (cascade)                                                                  | Phase 1 had `tourId` without a relation. Deleting a tour now also deletes its passes.                                                                                                                                                                         |
| S4  | `TourStep.title` and `TourStep.description` get `@default("")`                                                      | Publishing requires "a title **or** a description" (Phase 2 rule G). Both columns stay `NOT NULL`, and an empty string means "not set".                                                                                                                       |
| S5  | GIN index on `Project.allowedOrigins`                                                                               | CORS preflights for the builder and events endpoints don't know the project yet. They check "is this origin allowed by any project?" with an indexed `@> ARRAY[...]` lookup.                                                                                  |
| S6  | `AnalyticsEvent.stepId` given `VARCHAR(64)`                                                                         | Matches the payload validation limit. Still no FK, as in Phase 1, so history survives step deletion.                                                                                                                                                          |

No other columns, types, defaults or indexes were changed. The analytics table is created now, so Phase 5 needs no migration for ingestion.

## Validation rules worth knowing

- **Allowed origins** may be empty when a project is created or edited. A tour can't be **published** until there is at least one (rule G). Origins are exact: scheme + host + optional port, with no paths and no wildcards. Plain `http` is accepted only for `localhost`, `*.localhost`, `127.0.0.1` and `[::1]`.
- **Step order** is 1..N and contiguous, enforced by `UNIQUE (tourId, stepOrder)`. Inserts, moves, deletes and reorders rewrite the order inside one transaction, in two phases (negative temporary values first). This is needed because Postgres checks non-deferrable unique indexes row by row.
- **Page paths** (`TourStep.pageUrl`) are concrete pathnames. **Start URLs** (`Tour.startUrl`) may use `*` as a wildcard.
- **Plain text only:** content is normalised (control and bidi-override characters removed, whitespace tidied). It is never HTML-escaped on input, because rendering always uses text nodes.
- **Tracked URLs** keep origin + pathname only (decision 16). The SDK and the server both sanitise them.

## API contract changes vs Phase 1 §4

| Phase 1                                                                    | Phase 2                                                                                                                                                                                             | Reason                                                              |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `GET /api/builder/v1/session` (validate token)                             | **`POST /api/builder/v1/session`** redeems the pass (body `{ "pass": "wpb_…" }`, `text/plain` or JSON) → `{ accessToken, expiresAt, mode, tourId, project }`. **`GET`** validates the bearer token. | Single-use pass (S1).                                               |
| `POST /projects/{id}/builder-sessions` body `{ tourId?, mode, targetUrl }` | Same, with `mode` values upper-case (`BUILD` / `PREVIEW`) to match the enum                                                                                                                         | Consistency with the other enums.                                   |
| Admin publish/unpublish/archive/restore as separate routes                 | One dynamic route `POST /api/admin/v1/tours/{tourId}/{action}` with an allow-list                                                                                                                   | Same URLs, one handler.                                             |
| `GET /api/admin/v1/tours/{tourId}`                                         | Also returns `publishIssues` (dry-run of the publish rules)                                                                                                                                         | Lets the dashboard show what to fix before the user clicks Publish. |
| —                                                                          | New `GET /api/admin/v1/steps/{stepId}`                                                                                                                                                              | Needed by the step editor.                                          |
| Publish failure                                                            | `422 PUBLISH_VALIDATION_FAILED` with `details: PublishIssue[]` (`code`, `message`, `stepId?`, `stepOrder?`, `field?`)                                                                               | Actionable errors (rule G).                                         |

**Deferred to Phase 4 (not omitted):** the builder-token step CRUD routes (`/api/builder/v1/tours/...`, `/steps/...`) from Phase 1 §4.2. Phase 2 delivers the pass issue, redeem, validate and revoke flow they depend on. The services they will call already exist.
