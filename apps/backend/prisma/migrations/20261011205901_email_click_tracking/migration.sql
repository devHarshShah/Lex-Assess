-- AlterTable
ALTER TABLE "EmailCampaignRecipient" ADD COLUMN     "clickCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "firstClickedAt" TIMESTAMP(3),
ADD COLUMN     "linksTracked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "messageId" TEXT;

-- CreateTable
CREATE TABLE "EmailLinkClick" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "linkKey" TEXT NOT NULL,
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLinkClick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailLinkClick_campaignId_clickedAt_idx" ON "EmailLinkClick"("campaignId", "clickedAt");

-- CreateIndex
CREATE INDEX "EmailLinkClick_recipientId_idx" ON "EmailLinkClick"("recipientId");

-- CreateIndex
CREATE INDEX "EmailLinkClick_userId_clickedAt_idx" ON "EmailLinkClick"("userId", "clickedAt");

-- AddForeignKey
ALTER TABLE "EmailLinkClick" ADD CONSTRAINT "EmailLinkClick_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "EmailCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLinkClick" ADD CONSTRAINT "EmailLinkClick_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "EmailCampaignRecipient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
