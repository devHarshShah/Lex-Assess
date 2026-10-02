// One-off repair for an account whose razorpaySubscriptionId drifted away
// from the subscription that was actually paid - see the fix in
// payments.service.ts (createSubscription is now idempotent and
// verifyWebhook resolves by notes.userId) for why this could happen and why
// it shouldn't recur. This only patches existing bad state.
//
// Usage (against production, see DEPLOYMENT.md):
//   REPAIR_USER_EMAIL=... [REPAIR_SUBSCRIPTION_ID=...] [REPAIR_ACCESS_ENDS_AT=<ISO date>] node dist/src/scripts/repair-subscription.js
// REPAIR_ACCESS_ENDS_AT restores access until that date (used after a wrongly-ended subscription).

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  const email = process.env.REPAIR_USER_EMAIL;
  const subscriptionId = process.env.REPAIR_SUBSCRIPTION_ID;
  const accessEndsAtRaw = process.env.REPAIR_ACCESS_ENDS_AT;

  if (!email || (!subscriptionId && !accessEndsAtRaw)) {
    throw new Error('REPAIR_USER_EMAIL and one of REPAIR_SUBSCRIPTION_ID / REPAIR_ACCESS_ENDS_AT must be set.');
  }
  const accessEndsAt = accessEndsAtRaw ? new Date(accessEndsAtRaw) : undefined;
  if (accessEndsAt && Number.isNaN(accessEndsAt.getTime())) {
    throw new Error(`Invalid REPAIR_ACCESS_ENDS_AT: ${accessEndsAtRaw}`);
  }

  const before = await prisma.user.findUnique({ where: { email } });
  if (!before) {
    throw new Error(`No user found with email ${email}`);
  }

  console.log(
    `Before: hasActiveSubscription=${before.hasActiveSubscription}, accessEndsAt=${before.accessEndsAt?.toISOString() ?? null}, razorpaySubscriptionId=${before.razorpaySubscriptionId}`,
  );

  const after = await prisma.user.update({
    where: { email },
    data: {
      hasActiveSubscription: true,
      ...(subscriptionId ? { razorpaySubscriptionId: subscriptionId } : {}),
      ...(accessEndsAt ? { accessEndsAt } : {}),
    },
  });

  console.log(
    `After: hasActiveSubscription=${after.hasActiveSubscription}, accessEndsAt=${after.accessEndsAt?.toISOString() ?? null}, razorpaySubscriptionId=${after.razorpaySubscriptionId}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
