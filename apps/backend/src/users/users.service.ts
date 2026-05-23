import { AuthProvider, Role, User } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PublicUser } from './user.types';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  createEmailUser(input: {
    email: string;
    name: string;
    passwordHash: string;
    role?: Role;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: input.email.trim().toLowerCase(),
        name: input.name.trim(),
        passwordHash: input.passwordHash,
        role: input.role ?? Role.USER,
        authProvider: AuthProvider.EMAIL,
      },
    });
  }

  updateRoleByEmail(email: string, role: Role): Promise<User | null> {
    return this.prisma.user
      .update({
        where: { email: email.trim().toLowerCase() },
        data: { role },
      })
      .catch(() => null);
  }

  upsertGoogleUser(input: {
    email: string;
    name?: string;
    googleId: string;
  }): Promise<User> {
    const normalizedEmail = input.email.trim().toLowerCase();

    return this.prisma.user.upsert({
      where: { email: normalizedEmail },
      update: {
        name: input.name ?? normalizedEmail,
        googleId: input.googleId,
        authProvider: AuthProvider.GOOGLE,
      },
      create: {
        email: normalizedEmail,
        name: input.name ?? normalizedEmail,
        googleId: input.googleId,
        authProvider: AuthProvider.GOOGLE,
      },
    });
  }

  toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
}
