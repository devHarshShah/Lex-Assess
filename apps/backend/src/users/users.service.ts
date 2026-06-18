import { AuthProvider, NotificationPlacement, Role, User, VerificationType } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PublicUser, UserManagementRecord, UserProfileDto } from './user.types';

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

  findByIdWithProfile(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });
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
    avatarUrl?: string;
    role?: Role;
  }): Promise<User> {
    const normalizedEmail = input.email.trim().toLowerCase();

    return this.prisma.user.upsert({
      where: { email: normalizedEmail },
      update: {
        name: input.name ?? normalizedEmail,
        googleId: input.googleId,
        avatarUrl: input.avatarUrl,
        authProvider: AuthProvider.GOOGLE,
      },
      create: {
        email: normalizedEmail,
        name: input.name ?? normalizedEmail,
        googleId: input.googleId,
        avatarUrl: input.avatarUrl,
        authProvider: AuthProvider.GOOGLE,
        role: input.role ?? Role.USER,
      },
    });
  }

  toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
      profileCompleted: false,
      hasActiveSubscription: user.hasActiveSubscription,
    };
  }

  toPublicUserWithProfile(input: User & { profile: { isComplete: boolean } | null }): PublicUser {
    return {
      id: input.id,
      email: input.email,
      name: input.name,
      role: input.role,
      avatarUrl: input.avatarUrl,
      profileCompleted: input.profile?.isComplete ?? false,
      hasActiveSubscription: input.hasActiveSubscription,
    };
  }

  async listAllUsers(): Promise<UserManagementRecord[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: { profile: true },
    });

    return users.map((user) => this.toUserManagementRecord(user));
  }

  async listUsersWithProfiles() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: { profile: true },
    });
  }

  async updateUserById(
    id: string,
    input: { name?: string; role?: Role },
  ): Promise<UserManagementRecord | null> {
    const data: { name?: string; role?: Role } = {};

    if (input.name !== undefined) {
      data.name = input.name.trim();
    }

    if (input.role !== undefined) {
      data.role = input.role;
    }

    return this.prisma.user
      .update({
        where: { id },
        data,
      })
      .then((user) => this.toUserManagementRecord(user))
      .catch(() => null);
  }

  async deleteUserById(id: string): Promise<UserManagementRecord | null> {
    return this.prisma.user
      .delete({
        where: { id },
      })
      .then((user) => this.toUserManagementRecord(user))
      .catch(() => null);
  }

  toUserManagementRecord(user: User): UserManagementRecord {
    return {
      ...this.toPublicUser(user),
      authProvider: user.authProvider,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async getProfile(userId: string): Promise<UserProfileDto | null> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) return null;
    return {
      fullName: profile.fullName,
      college: profile.college,
      degree: profile.degree,
      currentYear: profile.currentYear,
      specialization: profile.specialization,
      gender: profile.gender,
      countryCode: profile.countryCode,
      mobileNumber: profile.mobileNumber,
      linkedinUrl: profile.linkedinUrl,
      resumeUrl: profile.resumeUrl,
      profilePhotoUrl: profile.profilePhotoUrl,
      verificationType: profile.verificationType,
      verificationDocUrl: profile.verificationDocUrl,
      isComplete: profile.isComplete,
      internshipGoal: profile.internshipGoal,
      internshipDuration: profile.internshipDuration,
    };
  }

  async upsertProfileStepOne(
    userId: string,
    input: {
      fullName: string;
      college: string;
      degree: string;
      currentYear: string;
      specialization: string;
      gender: 'MALE' | 'FEMALE' | 'OTHER';
      countryCode: string;
      mobileNumber: string;
      linkedinUrl?: string | null;
      resumeUrl?: string | null;
      profilePhotoUrl?: string | null;
      internshipGoal?: string | null;
      internshipDuration?: string | null;
    },
  ): Promise<UserProfileDto> {
    await this.prisma.userProfile.upsert({
      where: { userId },
      update: {
        fullName: input.fullName.trim(),
        college: input.college.trim(),
        degree: input.degree.trim(),
        currentYear: input.currentYear.trim(),
        specialization: input.specialization.trim(),
        gender: input.gender,
        countryCode: input.countryCode.trim(),
        mobileNumber: input.mobileNumber.trim(),
        linkedinUrl: input.linkedinUrl?.trim() || null,
        resumeUrl: input.resumeUrl?.trim() || null,
        profilePhotoUrl: input.profilePhotoUrl?.trim() || null,
        internshipGoal: input.internshipGoal?.trim() || null,
        internshipDuration: input.internshipDuration?.trim() || null,
      },
      create: {
        userId,
        fullName: input.fullName.trim(),
        college: input.college.trim(),
        degree: input.degree.trim(),
        currentYear: input.currentYear.trim(),
        specialization: input.specialization.trim(),
        gender: input.gender,
        countryCode: input.countryCode.trim(),
        mobileNumber: input.mobileNumber.trim(),
        linkedinUrl: input.linkedinUrl?.trim() || null,
        resumeUrl: input.resumeUrl?.trim() || null,
        profilePhotoUrl: input.profilePhotoUrl?.trim() || null,
        internshipGoal: input.internshipGoal?.trim() || null,
        internshipDuration: input.internshipDuration?.trim() || null,
      },
    });

    return this.getProfile(userId) as Promise<UserProfileDto>;
  }

  async upsertProfileVerification(
    userId: string,
    input: {
      verificationType: VerificationType;
      verificationDocUrl: string;
    },
  ): Promise<UserProfileDto> {
    await this.prisma.userProfile.upsert({
      where: { userId },
      update: {
        verificationType: input.verificationType,
        verificationDocUrl: input.verificationDocUrl.trim(),
        isComplete: true,
      },
      create: {
        userId,
        fullName: '',
        college: '',
        degree: '',
        currentYear: '',
        specialization: '',
        verificationType: input.verificationType,
        verificationDocUrl: input.verificationDocUrl.trim(),
        isComplete: true,
      },
    });

    return this.getProfile(userId) as Promise<UserProfileDto>;
  }

  listActiveSpecializations() {
    return this.prisma.specialization.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  listAllSpecializations() {
    return this.prisma.specialization.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  createSpecialization(name: string) {
    return this.prisma.specialization.create({
      data: { name: name.trim() },
    });
  }

  updateSpecialization(id: string, input: { name?: string; isActive?: boolean; sortOrder?: number }) {
    return this.prisma.specialization.update({
      where: { id },
      data: input,
    });
  }

  deleteSpecialization(id: string) {
    return this.prisma.specialization.delete({ where: { id } });
  }

  listColleges() {
    return this.prisma.lawCollege.findMany({
      orderBy: { name: 'asc' },
      select: { name: true },
    });
  }

  listAllColleges() {
    return this.prisma.lawCollege.findMany({
      orderBy: { name: 'asc' },
    });
  }

  createCollege(name: string) {
    return this.prisma.lawCollege.create({
      data: { name: name.trim() },
    });
  }

  updateCollege(id: string, name: string) {
    return this.prisma.lawCollege.update({
      where: { id },
      data: { name: name.trim() },
    });
  }

  deleteCollege(id: string) {
    return this.prisma.lawCollege.delete({ where: { id } });
  }

  listDegrees() {
    return this.prisma.degreeOption.findMany({
      orderBy: { name: 'asc' },
      select: { name: true },
    });
  }

  listAllDegrees() {
    return this.prisma.degreeOption.findMany({
      orderBy: { name: 'asc' },
    });
  }

  createDegree(name: string) {
    return this.prisma.degreeOption.create({
      data: { name: name.trim() },
    });
  }

  updateDegree(id: string, name: string) {
    return this.prisma.degreeOption.update({
      where: { id },
      data: { name: name.trim() },
    });
  }

  deleteDegree(id: string) {
    return this.prisma.degreeOption.delete({ where: { id } });
  }

  async verifyUserProfile(userId: string, verified: boolean) {
    return this.prisma.userProfile.update({
      where: { userId },
      data: { isComplete: verified },
    });
  }

  listPublicNotifications() {
    return this.prisma.notification.findMany({
      where: { isActive: true },
      orderBy: [{ placement: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  listAllNotifications() {
    return this.prisma.notification.findMany({
      orderBy: [{ placement: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  createNotification(input: {
    placement: NotificationPlacement;
    label?: string;
    title: string;
    description?: string;
  }) {
    return this.prisma.notification.create({
      data: {
        placement: input.placement,
        label: input.label?.trim() || null,
        title: input.title.trim(),
        description: input.description?.trim() || null,
      },
    });
  }

  updateNotification(
    id: string,
    input: {
      placement?: NotificationPlacement;
      label?: string;
      title?: string;
      description?: string;
      isActive?: boolean;
      sortOrder?: number;
    },
  ) {
    return this.prisma.notification.update({
      where: { id },
      data: {
        placement: input.placement,
        label: input.label === undefined ? undefined : input.label.trim() || null,
        title: input.title?.trim(),
        description: input.description === undefined ? undefined : input.description.trim() || null,
        isActive: input.isActive,
        sortOrder: input.sortOrder,
      },
    });
  }

  deleteNotification(id: string) {
    return this.prisma.notification.delete({ where: { id } });
  }

  async isProfileCompleted(userId: string): Promise<boolean> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { isComplete: true },
    });
    return profile?.isComplete ?? false;
  }

  createPasswordSetupToken(userId: string, tokenHash: string, expiresAt: Date) {
    return this.prisma.passwordSetupToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  }

  findValidPasswordSetupToken(tokenHash: string) {
    return this.prisma.passwordSetupToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  async consumePasswordSetupToken(tokenId: string, userId: string, passwordHash: string) {
    await this.prisma.$transaction([
      this.prisma.passwordSetupToken.update({
        where: { id: tokenId },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
    ]);
  }
}
