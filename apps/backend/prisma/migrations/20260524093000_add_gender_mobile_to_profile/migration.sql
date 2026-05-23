-- CreateEnum
CREATE TYPE "public"."Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- AlterTable
ALTER TABLE "public"."UserProfile"
ADD COLUMN "gender" "public"."Gender",
ADD COLUMN "countryCode" TEXT,
ADD COLUMN "mobileNumber" TEXT;
