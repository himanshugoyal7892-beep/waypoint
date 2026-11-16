-- CreateEnum
CREATE TYPE "public"."TipStyle" AS ENUM ('LIGHT', 'DARK', 'BRAND');

-- CreateEnum
CREATE TYPE "public"."TipCorners" AS ENUM ('ROUNDED', 'SOFT', 'SQUARE');

-- CreateEnum
CREATE TYPE "public"."TipProgress" AS ENUM ('COUNTER', 'DOTS', 'BAR', 'NONE');

-- CreateEnum
CREATE TYPE "public"."TipFont" AS ENUM ('SYSTEM', 'SITE');

-- AlterTable
ALTER TABLE "public"."Project" ADD COLUMN     "tipBackdrop" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "tipCorners" "public"."TipCorners" NOT NULL DEFAULT 'ROUNDED',
ADD COLUMN     "tipFont" "public"."TipFont" NOT NULL DEFAULT 'SYSTEM',
ADD COLUMN     "tipProgress" "public"."TipProgress" NOT NULL DEFAULT 'COUNTER',
ADD COLUMN     "tipStyle" "public"."TipStyle" NOT NULL DEFAULT 'LIGHT';
