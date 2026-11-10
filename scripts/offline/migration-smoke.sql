-- Exercises the constraints the application relies on. Every statement that must fail is
-- wrapped so the script only errors if a constraint is MISSING.
BEGIN;
INSERT INTO "User" (id, "clerkUserId", email, "updatedAt") VALUES ('u1', 'user_1', 'a@example.com', now());
INSERT INTO "Project" (id, name, domain, "allowedOrigins", "publicKey", "createdById", "updatedAt")
  VALUES ('p1', 'Demo', 'localhost:5173', ARRAY['http://localhost:5173'], 'pk_demoShop0000000000000000', 'u1', now());
INSERT INTO "Tour" (id, "projectId", name, "startUrl", "updatedAt") VALUES ('t1', 'p1', 'T', '/', now());
INSERT INTO "TourStep" (id, "tourId", "stepOrder", "cssSelector", "pageUrl", "updatedAt") VALUES ('s1', 't1', 1, '#a', '/', now());

-- Defaults
DO $$ BEGIN
  IF (SELECT status FROM "Tour" WHERE id = 't1') <> 'DRAFT' THEN RAISE EXCEPTION 'tour default status'; END IF;
  IF (SELECT "nextButtonLabel" || "backButtonLabel" || placement::text || "allowSkip"::text || title FROM "TourStep" WHERE id = 's1') <> 'NextBackAUTOtrue' THEN
    RAISE EXCEPTION 'step defaults'; END IF;
END $$;

-- Unique (tourId, stepOrder)
DO $$ BEGIN
  BEGIN
    INSERT INTO "TourStep" (id, "tourId", "stepOrder", "cssSelector", "pageUrl", "updatedAt") VALUES ('s2', 't1', 1, '#b', '/', now());
    RAISE EXCEPTION 'duplicate stepOrder accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;

-- Unique publicKey
DO $$ BEGIN
  BEGIN
    INSERT INTO "Project" (id, name, domain, "allowedOrigins", "publicKey", "createdById", "updatedAt")
      VALUES ('p2', 'Dup', 'a.com', ARRAY[]::text[], 'pk_demoShop0000000000000000', 'u1', now());
    RAISE EXCEPTION 'duplicate publicKey accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;

-- Event idempotency + GIN origin lookup
INSERT INTO "AnalyticsEvent" (id, "clientEventId", "projectId", "tourId", "tourVersion", "anonymousVisitorId", "sessionId", "eventName", "currentUrl", "occurredAt")
  VALUES ('e1', 'evt_12345678', 'p1', 't1', 1, 'vis_12345678', 'ses_12345678', 'tour_started', 'http://localhost:5173/', now());
INSERT INTO "AnalyticsEvent" (id, "clientEventId", "projectId", "tourId", "tourVersion", "anonymousVisitorId", "sessionId", "eventName", "currentUrl", "occurredAt")
  VALUES ('e2', 'evt_12345678', 'p1', 't1', 1, 'vis_12345678', 'ses_12345678', 'tour_started', 'http://localhost:5173/', now())
  ON CONFLICT ("projectId", "clientEventId") DO NOTHING;
DO $$ BEGIN
  IF (SELECT count(*) FROM "AnalyticsEvent") <> 1 THEN RAISE EXCEPTION 'event dedupe'; END IF;
  IF (SELECT count(*) FROM "Project" WHERE "allowedOrigins" @> ARRAY['http://localhost:5173']) <> 1 THEN RAISE EXCEPTION 'origin lookup'; END IF;
END $$;

-- Builder pass single-use: conditional update succeeds once
INSERT INTO "BuilderSession" (id, "passHash", "projectId", "targetOrigin", "createdById", "expiresAt")
  VALUES ('b1', repeat('a', 64), 'p1', 'http://localhost:5173', 'u1', now() + interval '2 hours');
DO $$ DECLARE n int; BEGIN
  UPDATE "BuilderSession" SET "redeemedAt" = now(), "accessTokenHash" = repeat('b', 64)
    WHERE "passHash" = repeat('a', 64) AND "redeemedAt" IS NULL AND "revokedAt" IS NULL AND "expiresAt" > now();
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'first redeem'; END IF;
  UPDATE "BuilderSession" SET "redeemedAt" = now()
    WHERE "passHash" = repeat('a', 64) AND "redeemedAt" IS NULL AND "revokedAt" IS NULL AND "expiresAt" > now();
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 0 THEN RAISE EXCEPTION 'second redeem succeeded'; END IF;
END $$;

-- Cascades
DELETE FROM "Project" WHERE id = 'p1';
DO $$ BEGIN
  IF (SELECT count(*) FROM "Tour") + (SELECT count(*) FROM "TourStep") + (SELECT count(*) FROM "AnalyticsEvent") + (SELECT count(*) FROM "BuilderSession") <> 0 THEN
    RAISE EXCEPTION 'cascade delete'; END IF;
END $$;
ROLLBACK;
