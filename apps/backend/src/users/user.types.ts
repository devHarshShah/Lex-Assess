import { Role } from '@prisma/client';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
  profileCompleted: boolean;
}

export interface UserManagementRecord extends PublicUser {
  authProvider: 'EMAIL' | 'GOOGLE';
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfileDto {
  fullName: string;
  college: string;
  degree: string;
  currentYear: string;
  specialization: string;
  linkedinUrl: string | null;
  resumeUrl: string | null;
  profilePhotoUrl: string | null;
  verificationType: 'ONGOING' | 'GRADUATED' | null;
  verificationDocUrl: string | null;
  isComplete: boolean;
}
