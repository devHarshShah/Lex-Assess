-- AlterTable
ALTER TABLE "public"."Question" ADD COLUMN     "sectionId" TEXT;

-- CreateTable
CREATE TABLE "public"."PaperSection" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaperSection_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."PaperSection" ADD CONSTRAINT "PaperSection_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "public"."QuestionPaperVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "public"."PaperSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
