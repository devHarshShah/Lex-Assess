import { Role } from '@prisma/client';

export interface AuthUserDto {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
  profileCompleted: boolean;
}

export interface AuthResponseDto {
  accessToken: string;
  user: AuthUserDto;
}
