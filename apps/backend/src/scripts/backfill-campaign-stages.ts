// One-off: fills in EmailCampaignRecipient.stageAtSend for campaigns sent before conversion
// tracking existed, so their metrics work. Stages are reconstructed from timestamps and the
// campaign's own target stages (see email-campaigns/stage-backfill.ts) and flagged stageEstimated
// unless the campaign targeted a single stage. Only fills rows where stageAtSend is still null.
//
// Dry run by default. Usage:
//   [CAMPAIGN_BACKFILL_APPLY=1] node dist/src/scripts/backfill-campaign-stages.js

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { estimateStageAtSend } from '../email-campaigns/stage-backfill';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main(): Promise<void> {
  const apply = process.env.CAMPAIGN_BACKFILL_APPLY === '1';
  const campaigns = await prisma.emailCampaign.findMany({ select: { id: true, name: true, couponId: true, audience: true } });
  let filled = 0;
  let skipped = 0;

  for (const c of campaigns) {
    const audienceStages = ((c.audience as { stages?: string[] } | null)?.stages ?? []).filter((s) => typeof s === 'string');
    const recipients = await prisma.emailCampaignRecipient.findMany({
      where: { campaignId: c.id, status: 'SENT', sentAt: { not: null }, stageAtSend: null },
      select: { id: true, userId: true, sentAt: true },
    });
    if (!recipients.length) continue;

    const users = await prisma.user.findMany({
      where: { id: { in: recipients.map((r) => r.userId) } },
      select: {
        id: true,
        createdAt: true,
        profile: { select: { createdAt: true, updatedAt: true, isComplete: true } },
        transactions: { where: { status: 'captured' }, orderBy: { createdAt: 'asc' }, take: 1, select: { createdAt: true } },
        couponRedemptions: { orderBy: { createdAt: 'asc' }, take: 1, select: { createdAt: true, confirmedAt: true } },
      },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    let estimated = 0;

    for (const r of recipients) {
      const u = byId.get(r.userId);
      const result = u
        ? estimateStageAtSend({
            sentAt: r.sentAt as Date,
            audienceStages,
            userCreatedAt: u.createdAt,
            profile: u.profile,
            firstCapturedAt: u.transactions[0]?.createdAt ?? null,
            redemption: u.couponRedemptions[0] ?? null,
          })
        : null;
      if (!result) {
        skipped++;
        continue;
      }
      if (result.estimated) estimated++;
      filled++;
      if (apply) {
        await prisma.emailCampaignRecipient.update({ where: { id: r.id }, data: { stageAtSend: result.stage, stageEstimated: result.estimated } });
      }
    }
    console.log(`${c.name}: ${recipients.length} recipients, ${estimated} estimated, audience=${audienceStages.join(',')}`);
  }
  console.log(`${apply ? 'APPLIED' : 'DRY RUN'}: ${filled} filled, ${skipped} skipped`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
