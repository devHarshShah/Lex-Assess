import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ProfileStepOneDto } from './dto/profile-step-one.dto';
import { ProfileVerificationDto } from './dto/profile-verification.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  me(@Req() req: { user: { sub: string } }) {
    return this.authService.getProfile(req.user.sub);
  }

  @Get('options')
  async options() {
    const degrees = [
      'BA LLB',
      'BBA LLB',
      'BCom LLB',
      'BSc LLB',
      'LLB',
      'LLM',
      'BLS LLB',
      'BA LLB (Hons.)',
      'BBA LLB (Hons.)',
    ];
    const years = ['1', '2', '3', '4', '5', 'Graduate'];

    const dynamic = await this.authService.getProfileOptions();
    return {
      ...dynamic,
      degrees,
      years,
    };
  }

  @Get('verification-types')
  verificationTypes() {
    return ['ONGOING', 'GRADUATED'];
  }

  @Get('completion-status')
  completionStatus(@Req() req: { user: { sub: string } }) {
    return this.authService.getProfileCompletionStatus(req.user.sub);
  }

  @Patch('me')
  updateStepOne(@Req() req: { user: { sub: string } }, @Body() dto: ProfileStepOneDto) {
    return this.authService.updateProfileStepOne(req.user.sub, dto);
  }

  @Patch('verification')
  updateStepTwo(@Req() req: { user: { sub: string } }, @Body() dto: ProfileVerificationDto) {
    return this.authService.updateProfileVerification(req.user.sub, dto);
  }
}
