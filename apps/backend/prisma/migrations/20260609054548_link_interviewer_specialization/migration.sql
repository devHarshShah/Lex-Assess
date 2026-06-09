/*
  Warnings:

  - You are about to drop the column `specializations` on the `InterviewerProfile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "InterviewerProfile" DROP COLUMN "specializations";

-- CreateTable
CREATE TABLE "_InterviewerProfileToSpecialization" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_InterviewerProfileToSpecialization_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_InterviewerProfileToSpecialization_B_index" ON "_InterviewerProfileToSpecialization"("B");

-- AddForeignKey
ALTER TABLE "_InterviewerProfileToSpecialization" ADD CONSTRAINT "_InterviewerProfileToSpecialization_A_fkey" FOREIGN KEY ("A") REFERENCES "InterviewerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InterviewerProfileToSpecialization" ADD CONSTRAINT "_InterviewerProfileToSpecialization_B_fkey" FOREIGN KEY ("B") REFERENCES "Specialization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
