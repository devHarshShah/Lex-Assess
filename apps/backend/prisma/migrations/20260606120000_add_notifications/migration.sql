-- CreateEnum
CREATE TYPE "public"."NotificationPlacement" AS ENUM ('BANNER', 'CARD');

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "placement" "public"."NotificationPlacement" NOT NULL,
    "label" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_placement_isActive_sortOrder_idx" ON "public"."Notification"("placement", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_placement_title_key" ON "public"."Notification"("placement", "title");
