import { Role } from '@prisma/client';

export { Role };

export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.USER]: 1,
  [Role.COMPANY]: 2,
  [Role.ADMIN]: 3,
  [Role.SUPERADMIN]: 4,
};

export function hasRequiredRole(userRole: Role, requiredRoles: Role[]): boolean {
  if (requiredRoles.length === 0) return true;

  return requiredRoles.some((requiredRole) => {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
  });
}
