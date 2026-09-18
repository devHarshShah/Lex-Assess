// Sets real passwords on the admin/superadmin accounts and removes the
// COMPANY/USER demo logins that PrismaService.seedDefaults() used to create
// unconditionally with a hardcoded password. Safe to run repeatedly.
//
// Usage (against production, see DEPLOYMENT.md):
//   SEED_ADMIN_PASSWORD=... SEED_SUPERADMIN_PASSWORD=... node dist/src/scripts/reset-admin-credentials.js

import { PrismaClient, Role } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const superadminPassword = process.env.SEED_SUPERADMIN_PASSWORD;

  if (!adminPassword || !superadminPassword) {
    throw new Error('SEED_ADMIN_PASSWORD and SEED_SUPERADMIN_PASSWORD must both be set.');
  }

  const [adminHash, superadminHash] = await Promise.all([
    hash(adminPassword, 10),
    hash(superadminPassword, 10),
  ]);

  await prisma.user.upsert({
    where: { email: 'admin@lexassess.com' },
    update: { passwordHash: adminHash },
    create: {
      email: 'admin@lexassess.com',
      name: 'Admin User',
      role: Role.ADMIN,
      passwordHash: adminHash,
    },
  });
  console.log('admin@lexassess.com: password rotated.');

  await prisma.user.upsert({
    where: { email: 'superadmin@lexassess.com' },
    update: { passwordHash: superadminHash },
    create: {
      email: 'superadmin@lexassess.com',
      name: 'Super Admin',
      role: Role.SUPERADMIN,
      passwordHash: superadminHash,
    },
  });
  console.log('superadmin@lexassess.com: password rotated.');

  const { count } = await prisma.user.deleteMany({
    where: { email: { in: ['student@lexassess.com', 'company@lexassess.com'] } },
  });
  console.log(`Removed ${count} demo account(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
