// One-off recovery for test attempts that were marked EXPIRED by the old
// startAttempt logic (see question-papers.service.ts: overdue attempts are now
// finalized instead). Submits each attempt with its autosaved answers, ending
// at the deadline, and auto-scores MCQs - the same path a late submit takes.
//
// Usage (against production, see DEPLOYMENT.md):
//   RECOVER_ATTEMPT_IDS=id1,id2 node dist/src/scripts/recover-expired-attempt.js

import { AttemptStatus, PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { QuestionPapersService } from '../question-papers/question-papers.service';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main(): Promise<void> {
  const ids = (process.env.RECOVER_ATTEMPT_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  if (ids.length === 0) throw new Error('RECOVER_ATTEMPT_IDS must be set.');

  const service = new QuestionPapersService(prisma as any);

  for (const id of ids) {
    const attempt = await prisma.testAttempt.findUnique({ where: { id } });
    if (!attempt) throw new Error(`No attempt ${id}`);
    if (attempt.status !== AttemptStatus.EXPIRED) {
      console.log(`${id}: status is ${attempt.status}, skipping`);
      continue;
    }
    // submitAttempt reads the user's latest attempt for the version; make sure it is this one.
    const latest = await prisma.testAttempt.findFirst({
      where: { userId: attempt.userId, versionId: attempt.versionId },
      orderBy: { createdAt: 'desc' },
    });
    if (latest?.id !== id) throw new Error(`${id}: not the latest attempt for its user/version`);

    const result = await service.submitAttempt(attempt.versionId, attempt.userId, { answers: {} });
    const scored = await prisma.testAttempt.findUnique({ where: { id } });
    console.log(`${id}: ${attempt.status} -> ${result.status}, endTime=${result.endTime?.toISOString()}, score=${scored?.score}`);
  }
}

main()
  .catch(err => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
