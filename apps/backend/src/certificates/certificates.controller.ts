import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CertificatesService } from './certificates.service';

@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Post('generate')
  @UseGuards(JwtAuthGuard)
  generate(@Req() req: { user: { sub: string } }) {
    return this.certificatesService.generateForUser(req.user.sub);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: { user: { sub: string } }) {
    return this.certificatesService.getMyCertificate(req.user.sub);
  }

  @Get('verify/:code')
  verify(@Param('code') code: string) {
    return this.certificatesService.verifyByCode(code);
  }
}
