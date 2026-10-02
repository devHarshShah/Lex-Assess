ALTER TABLE "CouponRedemption" ADD COLUMN "confirmedAt" TIMESTAMP(3);
ALTER TABLE "Coupon" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Conservative backfill: every existing redemption stays "used". Abandoned
-- checkouts are freed afterwards by src/scripts/reconcile-coupon-redemptions.ts,
-- which checks the real subscription status at Razorpay (the DB alone can't
-- tell a completed free-trial approval from an abandoned checkout).
UPDATE "CouponRedemption" SET "confirmedAt" = "createdAt";
