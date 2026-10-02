// One-off: frees coupon redemptions from checkouts that were never completed
// (abandoned before the coupon was only consumed on success). A redemption is
// freed only if the user has no captured payment AND Razorpay reports its
// subscription as still "created" (never authenticated) or no longer found.
// Anything else (authenticated/active/cancelled/...) is kept as used.
//
// Dry run by default. Usage:
//   [COUPON_RECONCILE_APPLY=1] node dist/src/scripts/reconcile-coupon-redemptions.js

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import Razorpay from 'razorpay';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});

async function main(): Promise<void> {
  const apply = process.env.COUPON_RECONCILE_APPLY === '1';
  const rows = await prisma.couponRedemption.findMany({
    where: { confirmedAt: { not: null } },
    include: { coupon: { select: { code: true } }, user: { select: { email: true } } },
  });
  console.log(`${apply ? 'APPLY' : 'DRY RUN'}: checking ${rows.length} redemptions`);

  for (const r of rows) {
    const paid = await prisma.transaction.count({ where: { userId: r.userId, status: 'captured' } });
    let status = 'no-subscription-id';
    if (r.razorpaySubscriptionId) {
      try {
        status = (await razorpay.subscriptions.fetch(r.razorpaySubscriptionId)).status;
      } catch {
        status = 'not-found';
      }
    }
    const free = paid === 0 && ['created', 'not-found', 'no-subscription-id'].includes(status);
    console.log(`${free ? 'FREE' : 'KEEP'} ${r.coupon.code} ${r.user.email} razorpay=${status} paid=${paid}`);

    if (free && apply) {
      await prisma.$transaction([
        prisma.couponRedemption.update({ where: { id: r.id }, data: { confirmedAt: null } }),
        prisma.coupon.update({ where: { id: r.couponId }, data: { redemptionCount: { decrement: 1 } } }),
      ]);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
