# Phase 5: Targeting, timing, links and user recognition

## What it does

Each automatic tour now has rules for **who** sees it and **how often**. Rules are checked on the server once per visit.

| Setting           | Choices                                                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Who sees it       | Everyone · New visitors (first seen within N days) · Returning after a break (away N+ days) · Existing visitors only (first seen before a launch date) |
| How often         | Once · Until finished (once per visit, at most N times) · Repeat every N days (at most N times, stops when finished)                                   |
| When              | Optional From / Until dates (whole UTC days, inclusive)                                                                                                |
| Start from a link | `?tour_start=<tourId>` opens the page with the tour running for anyone, ignoring the rules. The parameter is removed from the address bar.             |

Manual tours ignore the rules. They start from a link or from `ProductTour.start()`.

## Recognising logged-in users without site code

Project setting **Recognise logged-in users** tells the SDK where the page already keeps the user id:

- **Page variable**: e.g. `userId`, `app.user.id`. Only plain property reads; nothing is executed.
- **Google Tag Manager field**: e.g. `customer_code`. The latest non-empty value in `dataLayer` is used.
- **Cookie**: must be readable by scripts.

Sites with developers can call `ProductTour.identify(userId, { signedUpAt })` instead. A sign-up date makes "new" and "existing" exact. Without one, Waypoint counts from the first time it saw the user.

Values meaning "logged out" (empty, `null`, `undefined`, `0`, `guest`, …) are ignored. The SDK waits up to 1.5 s for the id to appear.

### Redington (checked while logged out, 13 Nov 2026)

- Container `GTM-MGWBDDHH`.
- The `dataLayer` carries `customer_code`, `company_code`, `email_id` and `country_store`. The page variables `window.userId`, `window.userEmail` and `window.storeId` exist.
- All of these are empty when logged out. Use the **Waypoint login check** bookmark, on the preview page, while logged in to confirm which one is filled. Recommended: **Google Tag Manager field → `customer_code`**. Do not use email or mobile.

## Privacy

- The server stores only `HMAC-SHA256(project salt, "u:"+userId)` (or `"a:"+anonymous browser id`). Each project has its own random salt (`Project.identitySalt`). Raw user ids, emails and phone numbers are never stored.
- `VisitorProfile` keeps first seen, last seen, the current visit's start, the previous visit, and the optional sign-up date.
- `TourVisitorState` keeps how many times each tour was shown, when it was last shown, and when it was completed or skipped.
- Analytics events carry the hashed key (`visitorKey`) only so the server can update that history. It is not stored on the events.
- **Open item for go-live:** Redington's cookie banner defaults analytics storage to "denied". Agree with their legal team whether Waypoint's visitor memory counts as functional or analytics. If analytics, gate the SDK on consent.

## How it works

1. `GET /api/public/v1/projects/{key}/tours` (cached 60 s) now also returns `identity` (the source and key) and each tour's `frequency`.
2. The SDK reads the user id, then calls `POST /api/public/v1/visits` (text/plain, `no-store`, rate-limited) with `{projectKey, visitorId, userId?, signedUpAt?}`. The response is `{visitorKey, eligibleTourIds}`. It is cached in sessionStorage for the session and per user, and refetched after login or `identify()`.
3. A new visit starts after 30 minutes without activity. "Returning after a break" compares this visit's start with the previous visit, so it holds for every page of that visit.
4. The engine auto-starts only tours that are in `eligibleTourIds`, match the page, and haven't been shown in this session. If the server can't be reached, it falls back to the old "once per browser" behaviour.
5. `tour_started`, `tour_completed` and `tour_skipped` events update `TourVisitorState`. This only happens for event ids not already stored, so retries don't double-count, and only for keys this project issued.
6. The preview bookmark sets `preview: true`, so the presenter always sees the tour regardless of rules.

## Verification (13 Nov 2026)

- `scripts/verify.sh`: all 13 steps pass. 179 tests: shared 70, web 40, sdk 69.
- `packages/sdk/tests/browser/targeting-check.mjs` against a production build on a local database, real Chrome: **18/18**. It covers:
  - until-finished across two devices, and the limit of 2 times
  - not shown twice in one visit
  - link start, including cleaning the address bar
  - new vs. 30-day-old users
  - away 3 vs. 45 days, staying "returning" for the whole visit
  - existing-only with an anonymous visitor, then with `identify()` and an old sign-up date
  - inside vs. outside the date window
  - only hashed keys stored
- `browser-check.mjs` (existing SDK behaviour): **15/15**.
- Dashboard forms were checked in a browser: saving, default values, and the error shown for a missing field name.
- SDK size: 15.2 KB gzip (was 13.9 KB).
- **Not verified:** which Redington field is filled after login. That needs a logged-in check by the user.

## Project analytics page (16 Nov 2026)

Sidebar → project → **Analytics** (`/dashboard/projects/{id}/analytics`, 7/30/90 days):

- **Totals:** visits, visitors, new visitors, returning visitors, logged-in share.
- **Visits per day:** a bar chart in UTC days.
- **Tours table:** for each tour, who it's shown to, started, finished, skipped and completion rate, with a link to the step-by-step analytics.
- **Recent visitors:** the 20 most recent, shown by a short code taken from the hashed key, with logged-in or anonymous, last and first seen, visits, and tours seen/finished. No names or ids, by design.

Data comes from `VisitorProfile.visits` (+1 on each new visit) and `ProjectDailyStat` (visits, new visitors and logged-in visits per project per UTC day). Both are written by `POST /visits`.

Visits are only counted when the snippet is on the site, directly or through Google Tag Manager (Preview mode included). The presenter's preview bookmark does not count visits.

Verified locally: `verify.sh` green (shared 70, web 41, sdk 69 tests). Targeting browser check 18/18. The page was rendered with the resulting data: 6 visitors and 11 visits, matching the database.

## More tour controls (16 Nov 2026)

**Per tour** ("Who sees it and when"):

| Control           | Values                                                     | Notes                                                                                                    |
| ----------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Logged in or not  | Everyone / Logged-in users only / Logged-out visitors only | Uses the project's "Recognise logged-in users" setting. Decided by the server per visit.                 |
| Device            | Any / Desktop only / Mobile only                           | Desktop means a viewport at least 1024 px wide (`DESKTOP_MIN_WIDTH`). Checked in the browser.            |
| Priority          | 0–100                                                      | If several automatic tours could start on a page, the highest wins. Ties go to the tour published first. |
| Wait for elements | 1–30 s (default 5)                                         | Also applies to tours started from a link.                                                               |

**Per project** ("Tour display"):

- **Automatic tours per visit:** limit 1–10, or empty for no limit. Counted in the session.
- **Brand colour:** `#RRGGBB`, applied to the primary button, the focus ring and the highlight ring.

**Caching:** the public tours list is now `s-maxage=20, stale-while-revalidate=40`, down from 60/300. If a linked tour isn't in the cached list, the SDK refetches it with a cache-busting parameter.

**Verified:** `verify.sh` green. Targeting browser check **23/23**, which adds login state, brand colour and the per-visit counter. SDK browser check 15/15.

## UAT demo tours

- **Pre-login demo: Discover Redington (10 steps)**, `cmwjcosm90003kx08m92222gf`.
  - Settings: start page `/en-sa`, automatic, logged-out visitors only, desktop, priority 10, waits 10 s, shown once.
  - Steps: search, All Categories, country selector, hero banner, "why Redington" stats, category carousel, featured products, "What are you looking for" grid, newsletter, Sign Up.
  - Verified on UAT on 16 Nov in real Chrome at 1440 px: all 10 steps, both from its link and automatically for a new logged-out visitor (it beats the other `/en-sa` tours on priority). `tour_completed` was recorded.
  - Demo link: https://uat-interstellar.redingtonmea.com/en-sa?tour_start=cmwjcosm90003kx08m92222gf
- **UAT: Welcome tour (6 steps)**, `cmwj9qa2v0010jp07hna08k0v`. Verified on 16 Nov.
- **Post-login tour:** pending. Needs the logged-in page structure (data-testids) from a logged-in session.
- **UAT quirks:**
  - The CookieYes banner appears bottom-left for new visitors.
  - Below 1024 px the site switches to a mobile header, so the desktop header steps don't apply there.
