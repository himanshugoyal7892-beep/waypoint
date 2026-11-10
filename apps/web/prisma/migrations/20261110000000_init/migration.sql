-- Initial schema for Waypoint (Phase 2). Hand-written to match prisma/schema.prisma;
-- run `prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url ...`
-- during verification to confirm there is no drift (see scripts/verify.sh).

-- CreateEnum
CREATE TYPE "TourStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TriggerType" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "Placement" AS ENUM ('TOP', 'BOTTOM', 'LEFT', 'RIGHT', 'AUTO');

-- CreateEnum
CREATE TYPE "BuilderMode" AS ENUM ('BUILD', 'PREVIEW');

-- CreateEnum
CREATE TYPE "EventName" AS ENUM ('tour_started', 'step_viewed', 'next_clicked', 'back_clicked', 'tour_skipped', 'tour_completed', 'element_not_found', 'tour_error');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "domain" VARCHAR(253) NOT NULL,
    "allowedOrigins" TEXT[],
    "publicKey" VARCHAR(40) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tour" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "status" "TourStatus" NOT NULL DEFAULT 'DRAFT',
    "startUrl" VARCHAR(2048) NOT NULL,
    "triggerType" "TriggerType" NOT NULL DEFAULT 'AUTO',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Tour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourStep" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "title" VARCHAR(120) NOT NULL DEFAULT '',
    "description" VARCHAR(1000) NOT NULL DEFAULT '',
    "cssSelector" VARCHAR(1000) NOT NULL,
    "pageUrl" VARCHAR(2048) NOT NULL,
    "placement" "Placement" NOT NULL DEFAULT 'AUTO',
    "nextButtonLabel" VARCHAR(30) NOT NULL DEFAULT 'Next',
    "backButtonLabel" VARCHAR(30) NOT NULL DEFAULT 'Back',
    "allowSkip" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuilderSession" (
    "id" TEXT NOT NULL,
    "passHash" CHAR(64) NOT NULL,
    "accessTokenHash" CHAR(64),
    "mode" "BuilderMode" NOT NULL DEFAULT 'BUILD',
    "projectId" TEXT NOT NULL,
    "tourId" TEXT,
    "targetOrigin" VARCHAR(300) NOT NULL,
    "createdById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "redeemedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuilderSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "clientEventId" VARCHAR(64) NOT NULL,
    "projectId" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "tourVersion" INTEGER NOT NULL,
    "stepId" VARCHAR(64),
    "stepOrder" INTEGER,
    "anonymousVisitorId" VARCHAR(64) NOT NULL,
    "sessionId" VARCHAR(64) NOT NULL,
    "eventName" "EventName" NOT NULL,
    "currentUrl" VARCHAR(2048) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "errorCode" VARCHAR(64),

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkUserId_key" ON "User"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_publicKey_key" ON "Project"("publicKey");

-- CreateIndex
CREATE INDEX "Project_createdById_idx" ON "Project"("createdById");

-- CreateIndex
CREATE INDEX "Project_allowedOrigins_idx" ON "Project" USING GIN ("allowedOrigins");

-- CreateIndex
CREATE INDEX "Tour_projectId_status_idx" ON "Tour"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TourStep_tourId_stepOrder_key" ON "TourStep"("tourId", "stepOrder");

-- CreateIndex
CREATE UNIQUE INDEX "BuilderSession_passHash_key" ON "BuilderSession"("passHash");

-- CreateIndex
CREATE UNIQUE INDEX "BuilderSession_accessTokenHash_key" ON "BuilderSession"("accessTokenHash");

-- CreateIndex
CREATE INDEX "BuilderSession_projectId_idx" ON "BuilderSession"("projectId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_tourId_eventName_occurredAt_idx" ON "AnalyticsEvent"("tourId", "eventName", "occurredAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_tourId_stepOrder_eventName_idx" ON "AnalyticsEvent"("tourId", "stepOrder", "eventName");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsEvent_projectId_clientEventId_key" ON "AnalyticsEvent"("projectId", "clientEventId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourStep" ADD CONSTRAINT "TourStep_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderSession" ADD CONSTRAINT "BuilderSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderSession" ADD CONSTRAINT "BuilderSession_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderSession" ADD CONSTRAINT "BuilderSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;
