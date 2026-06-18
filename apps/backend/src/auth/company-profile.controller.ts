import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CompanyProfileDto } from './dto/company-profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('company-profile')
@UseGuards(JwtAuthGuard)
export class CompanyProfileController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  me(@Req() req: { user: { sub: string } }) {
    return this.authService.getCompanyProfile(req.user.sub);
  }

  @Patch('me')
  upsert(@Req() req: { user: { sub: string } }, @Body() dto: CompanyProfileDto) {
    return this.authService.upsertCompanyProfile(req.user.sub, dto);
  }
}
