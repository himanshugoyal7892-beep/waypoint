-- CreateEnum
CREATE TYPE "public"."LoginState" AS ENUM ('ANY', 'LOGGED_IN', 'LOGGED_OUT');

-- CreateEnum
CREATE TYPE "public"."DeviceTarget" AS ENUM ('ANY', 'DESKTOP', 'MOBILE');

-- AlterTable
ALTER TABLE "public"."Project" ADD COLUMN     "maxAutoToursPerVisit" INTEGER,
ADD COLUMN     "themeColor" VARCHAR(7);

-- AlterTable
ALTER TABLE "public"."Tour" ADD COLUMN     "device" "public"."DeviceTarget" NOT NULL DEFAULT 'ANY',
ADD COLUMN     "loginState" "public"."LoginState" NOT NULL DEFAULT 'ANY',
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "waitSeconds" INTEGER NOT NULL DEFAULT 5;
