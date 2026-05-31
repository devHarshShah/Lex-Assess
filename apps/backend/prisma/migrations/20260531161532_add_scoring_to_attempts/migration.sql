-- AlterTable
ALTER TABLE "public"."TestAttempt" ADD COLUMN     "markedById" TEXT,
ADD COLUMN     "questionScores" JSONB;

-- AddForeignKey
ALTER TABLE "public"."TestAttempt" ADD CONSTRAINT "TestAttempt_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
