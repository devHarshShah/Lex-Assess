import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcryptjs';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit(): Promise<void> {
    await this.$connect();
    await this.seedDefaults();
  }

  private async seedDefaults(): Promise<void> {
    const totalUsers = await this.user.count();
    if (totalUsers > 0) return;

    const passwordHash = await hash('Pass@123', 10);

    await this.user.createMany({
      data: [
        {
          email: 'superadmin@lexassess.com',
          name: 'Super Admin',
          role: Role.SUPERADMIN,
          passwordHash,
        },
        {
          email: 'admin@lexassess.com',
          name: 'Admin User',
          role: Role.ADMIN,
          passwordHash,
        },
        {
          email: 'company@lexassess.com',
          name: 'Company User',
          role: Role.COMPANY,
          passwordHash,
        },
        {
          email: 'student@lexassess.com',
          name: 'Student User',
          role: Role.USER,
          passwordHash,
        },
      ],
    });
  }
}
