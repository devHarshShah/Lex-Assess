// One-off repair for an account whose razorpaySubscriptionId drifted away
// from the subscription that was actually paid - see the fix in
// payments.service.ts (createSubscription is now idempotent and
// verifyWebhook resolves by notes.userId) for why this could happen and why
// it shouldn't recur. This only patches existing bad state.
//
// Usage (against production, see DEPLOYMENT.md):
//   REPAIR_USER_EMAIL=... REPAIR_SUBSCRIPTION_ID=... node dist/src/scripts/repair-subscription.js

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  const email = process.env.REPAIR_USER_EMAIL;
  const subscriptionId = process.env.REPAIR_SUBSCRIPTION_ID;

  if (!email || !subscriptionId) {
    throw new Error('REPAIR_USER_EMAIL and REPAIR_SUBSCRIPTION_ID must both be set.');
  }

  const before = await prisma.user.findUnique({ where: { email } });
  if (!before) {
    throw new Error(`No user found with email ${email}`);
  }

  console.log(
    `Before: hasActiveSubscription=${before.hasActiveSubscription}, razorpaySubscriptionId=${before.razorpaySubscriptionId}`,
  );

  const after = await prisma.user.update({
    where: { email },
    data: { hasActiveSubscription: true, razorpaySubscriptionId: subscriptionId },
  });

  console.log(
    `After: hasActiveSubscription=${after.hasActiveSubscription}, razorpaySubscriptionId=${after.razorpaySubscriptionId}`,
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
