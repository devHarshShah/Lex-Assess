-- AlterTable
ALTER TABLE "public"."QuestionPaper" ADD COLUMN     "createdById" TEXT;

-- AddForeignKey
ALTER TABLE "public"."QuestionPaper" ADD CONSTRAINT "QuestionPaper_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
