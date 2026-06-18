-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "rollNumber" TEXT;

-- CreateTable
CREATE TABLE "RollNumberCounter" (
    "year" INTEGER NOT NULL,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RollNumberCounter_pkey" PRIMARY KEY ("year")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_rollNumber_key" ON "UserProfile"("rollNumber");
