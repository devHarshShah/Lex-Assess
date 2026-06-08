-- CreateEnum
CREATE TYPE "public"."CandidateWorkflowStatus" AS ENUM ('SHORTLISTED', 'CONTACTED', 'INTERVIEWING', 'OFFERED', 'REJECTED');

-- CreateTable
CREATE TABLE "public"."CompanyCandidateDecision" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "status" "public"."CandidateWorkflowStatus" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyCandidateDecision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyCandidateDecision_companyId_attemptId_key" ON "public"."CompanyCandidateDecision"("companyId", "attemptId");

-- CreateIndex
CREATE INDEX "CompanyCandidateDecision_companyId_status_idx" ON "public"."CompanyCandidateDecision"("companyId", "status");

-- CreateIndex
CREATE INDEX "CompanyCandidateDecision_attemptId_idx" ON "public"."CompanyCandidateDecision"("attemptId");

-- AddForeignKey
ALTER TABLE "public"."CompanyCandidateDecision" ADD CONSTRAINT "CompanyCandidateDecision_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompanyCandidateDecision" ADD CONSTRAINT "CompanyCandidateDecision_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "public"."TestAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
