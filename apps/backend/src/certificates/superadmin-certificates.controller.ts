import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/roles';
import { CertificatesService } from './certificates.service';
import { IssueCertificateDto } from './dto/issue-certificate.dto';

@Controller('superadmin/certificates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPERADMIN)
export class SuperadminCertificatesController {
  constructor(private readonly certificates: CertificatesService) {}

  @Get('candidates')
  search(@Query('q') q = '') {
    return this.certificates.searchCandidates(q.slice(0, 100));
  }

  @Get('candidates/:userId')
  defaults(@Param('userId') userId: string) {
    return this.certificates.getIssueDefaults(userId);
  }

  // Base64 so the page can show it without a separate authenticated file download
  @Post('preview')
  async preview(@Body() dto: IssueCertificateDto) {
    const pdf = await this.certificates.previewForAdmin(dto);
    return { pdfBase64: pdf.toString('base64') };
  }

  @Post('send')
  send(@Req() req: { user: { sub: string } }, @Body() dto: IssueCertificateDto) {
    return this.certificates.issueByAdmin(req.user.sub, dto);
  }
}
