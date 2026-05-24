-- CreateEnum
CREATE TYPE "public"."PaperStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."QuestionType" AS ENUM ('MCQ', 'SUBJECTIVE', 'SUBJECTIVE_WITH_ANSWER');

-- CreateTable
CREATE TABLE "public"."QuestionPaper" (
    "id" TEXT NOT NULL,
    "specializationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionPaper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."QuestionPaperVersion" (
    "id" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "versionName" TEXT NOT NULL,
    "status" "public"."PaperStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionPaperVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Question" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "type" "public"."QuestionType" NOT NULL,
    "text" TEXT NOT NULL,
    "marks" INTEGER NOT NULL DEFAULT 1,
    "options" JSONB,
    "answer" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuestionPaperVersion_paperId_versionName_key" ON "public"."QuestionPaperVersion"("paperId", "versionName");

-- AddForeignKey
ALTER TABLE "public"."QuestionPaper" ADD CONSTRAINT "QuestionPaper_specializationId_fkey" FOREIGN KEY ("specializationId") REFERENCES "public"."Specialization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionPaperVersion" ADD CONSTRAINT "QuestionPaperVersion_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "public"."QuestionPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "public"."QuestionPaperVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
