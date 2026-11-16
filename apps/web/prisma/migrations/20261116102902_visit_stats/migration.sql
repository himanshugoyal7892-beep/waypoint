-- AlterTable
ALTER TABLE "public"."VisitorProfile" ADD COLUMN     "visits" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "public"."ProjectDailyStat" (
    "projectId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "visits" INTEGER NOT NULL DEFAULT 0,
    "newVisitors" INTEGER NOT NULL DEFAULT 0,
    "identifiedVisits" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProjectDailyStat_pkey" PRIMARY KEY ("projectId","day")
);

-- CreateIndex
CREATE INDEX "VisitorProfile_projectId_lastSeenAt_idx" ON "public"."VisitorProfile"("projectId", "lastSeenAt");

-- AddForeignKey
ALTER TABLE "public"."ProjectDailyStat" ADD CONSTRAINT "ProjectDailyStat_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
