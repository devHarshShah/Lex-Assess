import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Roles } from './decorators/roles.decorator';
import { ToggleProfileVerificationDto } from './dto/toggle-profile-verification.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Role } from './roles';

@Controller('superadmin/profiles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPERADMIN)
export class SuperadminProfilesController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  list() {
    return this.authService.listProfilesForSuperadmin();
  }

  @Patch(':userId/verify')
  verify(@Param('userId') userId: string, @Body() dto: ToggleProfileVerificationDto) {
    return this.authService.verifyProfileForSuperadmin(userId, dto.verified);
  }
}
