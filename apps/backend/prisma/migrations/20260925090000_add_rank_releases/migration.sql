-- AlterTable
ALTER TABLE "Certificate" DROP COLUMN "rank";

-- CreateTable
CREATE TABLE "RankRelease" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "releasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedById" TEXT NOT NULL,
    "candidateCount" INTEGER NOT NULL,

    CONSTRAINT "RankRelease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankEntry" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "anonymizedId" TEXT NOT NULL,
    "practiceArea" TEXT NOT NULL,
    "testScore" DOUBLE PRECISION NOT NULL,
    "testMaxScore" DOUBLE PRECISION NOT NULL,
    "normalizedTest" DOUBLE PRECISION NOT NULL,
    "interviewMarks" DOUBLE PRECISION NOT NULL,
    "cvScore" DOUBLE PRECISION NOT NULL,
    "commonScore" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "RankEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RankRelease_releasedAt_idx" ON "RankRelease"("releasedAt");

-- CreateIndex
CREATE INDEX "RankEntry_releaseId_rank_idx" ON "RankEntry"("releaseId", "rank");

-- CreateIndex
CREATE INDEX "RankEntry_userId_idx" ON "RankEntry"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RankEntry_releaseId_userId_key" ON "RankEntry"("releaseId", "userId");

-- AddForeignKey
ALTER TABLE "RankRelease" ADD CONSTRAINT "RankRelease_releasedById_fkey" FOREIGN KEY ("releasedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankEntry" ADD CONSTRAINT "RankEntry_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "RankRelease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankEntry" ADD CONSTRAINT "RankEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
