-- AlterTable
ALTER TABLE "public"."Question" ADD COLUMN     "timeLimitSeconds" INTEGER;

-- AlterTable
ALTER TABLE "public"."QuestionPaperVersion" ADD COLUMN     "timeLimitMinutes" INTEGER NOT NULL DEFAULT 60;
