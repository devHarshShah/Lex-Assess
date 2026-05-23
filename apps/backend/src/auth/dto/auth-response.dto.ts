import { Role } from '@prisma/client';

export interface AuthUserDto {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface AuthResponseDto {
  accessToken: string;
  user: AuthUserDto;
}
