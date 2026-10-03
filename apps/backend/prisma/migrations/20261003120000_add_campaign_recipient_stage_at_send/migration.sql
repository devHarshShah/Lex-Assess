ALTER TABLE "EmailCampaignRecipient" ADD COLUMN "stageAtSend" TEXT;
ALTER TABLE "EmailCampaignRecipient" ADD COLUMN "stageEstimated" BOOLEAN NOT NULL DEFAULT false;
