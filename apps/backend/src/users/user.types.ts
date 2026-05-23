import { Role } from '@prisma/client';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}
