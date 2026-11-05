-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN     "pricePaise" INTEGER;
-- AlterTable
ALTER TABLE "CouponRedemption" ADD COLUMN     "razorpayOrderId" TEXT;
-- CreateIndex
CREATE UNIQUE INDEX "CouponRedemption_razorpayOrderId_key" ON "CouponRedemption"("razorpayOrderId");
