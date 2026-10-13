// Runs every practice-area seed script, then reconciles which categories are
// visible to students against which ones actually have a published paper.
//
// Each seed-*.ts self-invokes `main()` and calls `prisma.$disconnect()` at
// module load, so they can't be `require`d together in one process without
// fighting over connections/exit codes. Running them as separate child
// processes keeps each one exactly as it behaves standalone.
//
// Usage (against production, see DEPLOYMENT.md):
//   node dist/src/scripts/seed-all.js

import { execFileSync } from 'child_process';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Every practice-area seed script, in no particular order - each looks up
// its own category by name (see the findUniqueOrThrow calls in each file)
// rather than creating one, so seedProfileDefaults() must have already run
// (it does, at app boot) before this script is run.
const SEED_SCRIPTS = [
  'seed-maritime',
  'seed-capital-markets',
  'seed-taxation',
  'seed-ipr',
  'seed-labour',
  'seed-data-protection',
  'seed-energy-infrastructure',
  'seed-general-corporate-law',
  'seed-media-entertainment',
  'seed-legal-research-skills',
];

function runSeedScripts(): void {
  for (const name of SEED_SCRIPTS) {
    console.log(`\n=== Running ${name} ===`);
    execFileSync(process.execPath, [path.join(__dirname, `${name}.js`)], {
      stdio: 'inherit',
    });
  }
}

// The profile dropdown must never offer a category with nothing behind it.
// Derived from data (has a published paper?) rather than a hardcoded list,
// so it stays correct as papers are added or removed later.
async function reconcileActiveSpecializations(): Promise<void> {
  console.log('\n=== Reconciling category visibility against published papers ===');

  const specializations = await prisma.specialization.findMany();

  for (const specialization of specializations) {
    const publishedPaperCount = await prisma.questionPaper.count({
      where: {
        specializationId: specialization.id,
        versions: { some: { status: 'PUBLISHED' } },
      },
    });

    const shouldBeActive = publishedPaperCount > 0;
    if (specialization.isActive !== shouldBeActive) {
      await prisma.specialization.update({
        where: { id: specialization.id },
        data: { isActive: shouldBeActive },
      });
      console.log(
        `  ${specialization.name}: isActive ${specialization.isActive} -> ${shouldBeActive} (${publishedPaperCount} published paper(s))`,
      );
    } else {
      console.log(`  ${specialization.name}: isActive=${specialization.isActive} (unchanged)`);
    }
  }
}

async function main(): Promise<void> {
  runSeedScripts();
  await reconcileActiveSpecializations();
  console.log('\nAll seed scripts completed and category visibility reconciled.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
