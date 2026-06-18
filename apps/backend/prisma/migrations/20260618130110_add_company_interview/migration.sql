-- CreateEnum
CREATE TYPE "CompanyInterviewStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "CompanyInterview" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "status" "CompanyInterviewStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyInterview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyInterview_studentId_idx" ON "CompanyInterview"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyInterview_companyId_studentId_key" ON "CompanyInterview"("companyId", "studentId");

-- AddForeignKey
ALTER TABLE "CompanyInterview" ADD CONSTRAINT "CompanyInterview_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyInterview" ADD CONSTRAINT "CompanyInterview_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
