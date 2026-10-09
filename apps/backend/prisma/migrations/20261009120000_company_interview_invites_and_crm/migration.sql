-- CreateEnum
CREATE TYPE "CompanyInterviewSource" AS ENUM ('COMPANY', 'SUPERADMIN');
CREATE TYPE "CrmLeadStatus" AS ENUM ('NEW', 'ATTEMPTED', 'CONTACTED', 'INTERESTED', 'FOLLOW_UP', 'NOT_INTERESTED', 'DO_NOT_CONTACT', 'INVALID_NUMBER');
CREATE TYPE "CrmPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "CrmActivityType" AS ENUM ('CALL', 'WHATSAPP', 'EMAIL', 'NOTE', 'STATUS_CHANGE', 'FOLLOW_UP_SET', 'INTERVIEW_SCHEDULED', 'INTERVIEW_RESCHEDULED', 'INTERVIEW_CANCELLED');
CREATE TYPE "CrmCallOutcome" AS ENUM ('CONNECTED', 'NO_ANSWER', 'BUSY', 'SWITCHED_OFF', 'WRONG_NUMBER', 'CALLBACK_REQUESTED');

-- AlterTable: existing company interviews get a one-hour slot. endTime stays nullable: the
-- previous app revision keeps serving (and inserting rows without it) until the deploy finishes.
ALTER TABLE "CompanyInterview" ADD COLUMN "endTime" TIMESTAMP(3);
UPDATE "CompanyInterview" SET "endTime" = "scheduledAt" + INTERVAL '1 hour' WHERE "endTime" IS NULL;
ALTER TABLE "CompanyInterview"
  ADD COLUMN "source" "CompanyInterviewSource" NOT NULL DEFAULT 'COMPANY',
  ADD COLUMN "meetLink" TEXT,
  ADD COLUMN "googleEventId" TEXT,
  ADD COLUMN "extraAttendees" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "inviteMessage" TEXT,
  ADD COLUMN "scheduledById" TEXT,
  ADD COLUMN "rescheduleCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "cancelReason" TEXT,
  ADD COLUMN "studentEmailSentAt" TIMESTAMP(3),
  ADD COLUMN "companyEmailSentAt" TIMESTAMP(3);

CREATE INDEX "CompanyInterview_scheduledAt_idx" ON "CompanyInterview"("scheduledAt");
ALTER TABLE "CompanyInterview" ADD CONSTRAINT "CompanyInterview_scheduledById_fkey" FOREIGN KEY ("scheduledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "CrmLead" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "CrmLeadStatus" NOT NULL DEFAULT 'NEW',
    "priority" "CrmPriority" NOT NULL DEFAULT 'MEDIUM',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "nextFollowUpAt" TIMESTAMP(3),
    "lastContactedAt" TIMESTAMP(3),
    "contactAttempts" INTEGER NOT NULL DEFAULT 0,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmLead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" "CrmActivityType" NOT NULL,
    "callOutcome" "CrmCallOutcome",
    "fromStatus" "CrmLeadStatus",
    "toStatus" "CrmLeadStatus",
    "note" TEXT,
    "followUpAt" TIMESTAMP(3),
    "durationSec" INTEGER,
    "stageAtActivity" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmActivity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CrmLead_userId_key" ON "CrmLead"("userId");
CREATE INDEX "CrmLead_status_nextFollowUpAt_idx" ON "CrmLead"("status", "nextFollowUpAt");
CREATE INDEX "CrmActivity_userId_createdAt_idx" ON "CrmActivity"("userId", "createdAt");
CREATE INDEX "CrmActivity_actorId_createdAt_idx" ON "CrmActivity"("actorId", "createdAt");
CREATE INDEX "CrmActivity_type_createdAt_idx" ON "CrmActivity"("type", "createdAt");

ALTER TABLE "CrmLead" ADD CONSTRAINT "CrmLead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
