-- CreateEnum
CREATE TYPE "public"."Audience" AS ENUM ('ALL', 'NEW_USERS', 'DORMANT_USERS', 'EXISTING_USERS');

-- CreateEnum
CREATE TYPE "public"."Frequency" AS ENUM ('ONCE', 'UNTIL_COMPLETED', 'INTERVAL');

-- CreateEnum
CREATE TYPE "public"."IdentitySource" AS ENUM ('NONE', 'WINDOW', 'DATALAYER', 'COOKIE');

-- AlterTable
ALTER TABLE "public"."Project" ADD COLUMN     "identityKey" VARCHAR(100),
ADD COLUMN     "identitySalt" VARCHAR(64) NOT NULL DEFAULT replace((gen_random_uuid())::text, '-'::text, ''::text),
ADD COLUMN     "identitySource" "public"."IdentitySource" NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "public"."Tour" ADD COLUMN     "audience" "public"."Audience" NOT NULL DEFAULT 'ALL',
ADD COLUMN     "audienceBefore" DATE,
ADD COLUMN     "audienceDays" INTEGER,
ADD COLUMN     "endsAt" DATE,
ADD COLUMN     "frequency" "public"."Frequency" NOT NULL DEFAULT 'ONCE',
ADD COLUMN     "intervalDays" INTEGER,
ADD COLUMN     "maxShows" INTEGER,
ADD COLUMN     "startsAt" DATE;

-- CreateTable
CREATE TABLE "public"."VisitorProfile" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "visitorKey" CHAR(64) NOT NULL,
    "identified" BOOLEAN NOT NULL DEFAULT false,
    "firstSeenAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "visitStartedAt" TIMESTAMP(3) NOT NULL,
    "previousVisitAt" TIMESTAMP(3),
    "signedUpAt" DATE,

    CONSTRAINT "VisitorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TourVisitorState" (
    "tourId" TEXT NOT NULL,
    "visitorKey" CHAR(64) NOT NULL,
    "shows" INTEGER NOT NULL DEFAULT 0,
    "lastShownAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "skippedAt" TIMESTAMP(3),

    CONSTRAINT "TourVisitorState_pkey" PRIMARY KEY ("tourId","visitorKey")
);

-- CreateIndex
CREATE UNIQUE INDEX "VisitorProfile_projectId_visitorKey_key" ON "public"."VisitorProfile"("projectId", "visitorKey");

-- AddForeignKey
ALTER TABLE "public"."VisitorProfile" ADD CONSTRAINT "VisitorProfile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TourVisitorState" ADD CONSTRAINT "TourVisitorState_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "public"."Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;
