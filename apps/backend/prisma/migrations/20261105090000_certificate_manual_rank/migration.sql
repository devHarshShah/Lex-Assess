-- AlterTable
ALTER TABLE "Certificate" ALTER COLUMN "commonScore" DROP NOT NULL,
ADD COLUMN     "manualRank" INTEGER,
ADD COLUMN     "issuedById" TEXT;
