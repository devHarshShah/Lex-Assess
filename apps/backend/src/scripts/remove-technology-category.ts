// One-off: retire the boot-seeded "Technology" category in favour of the
// panel-created "Legal Tech" one. Run AFTER seed-legal-tech.js, which moves
// the Legal Tech paper off Technology. Deleting a Specialization cascades to
// its question papers, so this refuses to run while any paper is attached.
//
// Not part of seed-all.ts. Safe to re-run: it is a no-op once Technology is gone.

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const technology = await prisma.specialization.findUnique({
    where: { name: 'Technology' },
    include: {
      interviewers: { select: { id: true } },
      _count: { select: { questionPapers: true } },
    },
  });
  if (!technology) {
    console.log('Technology category not found - nothing to do.');
    return;
  }

  const legalTech = await prisma.specialization.findFirst({
    where: { name: { equals: 'Legal Tech', mode: 'insensitive' } },
  });
  if (!legalTech) {
    throw new Error(
      'Category "Legal Tech" not found - create it in the superadmin panel first.',
    );
  }

  if (technology._count.questionPapers > 0) {
    throw new Error(
      `Technology still has ${technology._count.questionPapers} paper(s); deleting it would cascade-delete them. Run seed-legal-tech.js first.`,
    );
  }

  await prisma.$transaction(async (tx) => {
    // UserProfile.specialization is a plain string, not a foreign key.
    const profiles = await tx.userProfile.updateMany({
      where: { specialization: technology.name },
      data: { specialization: legalTech.name },
    });
    console.log(
      `Moved ${profiles.count} student profile(s) from Technology to ${legalTech.name}.`,
    );

    for (const interviewer of technology.interviewers) {
      await tx.interviewerProfile.update({
        where: { id: interviewer.id },
        data: { specializations: { connect: { id: legalTech.id } } },
      });
    }
    console.log(
      `Linked ${technology.interviewers.length} interviewer(s) to ${legalTech.name}.`,
    );

    await tx.specialization.delete({ where: { id: technology.id } });
    console.log('Deleted Technology category.');
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
