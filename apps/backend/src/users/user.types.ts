import { Role } from '@prisma/client';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
  profileCompleted: boolean;
  hasActiveSubscription: boolean;
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
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
  countryCode: string | null;
  mobileNumber: string | null;
  linkedinUrl: string | null;
  resumeUrl: string | null;
  profilePhotoUrl: string | null;
  verificationType: 'ONGOING' | 'GRADUATED' | null;
  verificationDocUrl: string | null;
  isComplete: boolean;
  internshipGoal: string | null;
  internshipDuration: string | null;
  internshipPeriod: string | null;
  rollNumber: string | null;
  cvScore: number | null;
}

export type CompanyVerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface CompanyProfileDto {
  companyName: string;
  companyLegalName: string;
  companyPan: string | null;
  companyGstin: string | null;
  operatorName: string;
  operatorDesignation: string;
  operatorIdCardUrl: string | null;
  verificationStatus: CompanyVerificationStatus;
  rejectionReason: string | null;
  reviewedAt: Date | null;
}
