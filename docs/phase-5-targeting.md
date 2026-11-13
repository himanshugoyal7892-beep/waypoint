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
