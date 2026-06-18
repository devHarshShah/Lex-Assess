import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Roles } from './decorators/roles.decorator';
import { ReviewCompanyProfileDto } from './dto/review-company-profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Role } from './roles';

@Controller('superadmin/company-profiles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPERADMIN)
export class SuperadminCompanyProfilesController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  list() {
    return this.authService.listCompanyProfilesForSuperadmin();
  }

  @Patch(':userId/review')
  review(
    @Req() req: { user: { sub: string } },
    @Param('userId') userId: string,
    @Body() dto: ReviewCompanyProfileDto,
  ) {
    return this.authService.reviewCompanyProfileForSuperadmin(req.user.sub, userId, dto);
  }
}
