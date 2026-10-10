-- AlterTable: every existing interview was only created after its calendar event succeeded,
-- so mark them synced; otherwise the worker would create duplicate events for them.
ALTER TABLE "Interview" ADD COLUMN "calendarSyncedAt" TIMESTAMP(3),
ADD COLUMN "calendarSyncAttempts" INTEGER NOT NULL DEFAULT 0;
UPDATE "Interview" SET "calendarSyncedAt" = "createdAt";

-- CreateIndex
CREATE INDEX "Interview_calendarSyncedAt_idx" ON "Interview"("calendarSyncedAt");

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);
