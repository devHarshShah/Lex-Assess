import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from './decorators/roles.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Role } from './roles';

@Controller('rbac')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RbacDemoController {
  @Get('superadmin')
  @Roles(Role.SUPERADMIN)
  superadminOnly() {
    return { message: 'Visible to SUPERADMIN only' };
  }

  @Get('admin')
  @Roles(Role.ADMIN)
  adminAndAbove() {
    return { message: 'Visible to ADMIN and SUPERADMIN' };
  }

  @Get('company')
  @Roles(Role.COMPANY)
  companyAndAbove() {
    return { message: 'Visible to COMPANY, ADMIN, SUPERADMIN' };
  }

  @Get('user')
  @Roles(Role.USER)
  userAndAbove() {
    return { message: 'Visible to any authenticated user' };
  }
}
