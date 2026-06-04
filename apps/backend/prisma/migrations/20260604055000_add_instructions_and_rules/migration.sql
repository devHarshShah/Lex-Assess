-- AlterTable
ALTER TABLE "public"."QuestionPaperVersion" ADD COLUMN     "instructions" TEXT;

-- AlterTable
ALTER TABLE "public"."PaperSection" ADD COLUMN     "rules" JSONB;
