import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/roles';
import { EmailCampaignsService } from './email-campaigns.service';
import type { CampaignInput } from './email-campaigns.service';
import { EmailTemplatesService } from './email-templates.service';
import type { TemplateInput } from './email-templates.service';

@Controller('superadmin/email')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPERADMIN)
export class SuperadminEmailController {
  constructor(
    private readonly campaigns: EmailCampaignsService,
    private readonly templates: EmailTemplatesService,
  ) {}

  @Get('meta')
  meta() {
    return this.campaigns.getMeta();
  }

  @Post('audience/preview')
  @HttpCode(HttpStatus.OK)
  previewAudience(@Body() body: CampaignInput) {
    return this.campaigns.previewAudience(body ?? {});
  }

  @Post('render-preview')
  @HttpCode(HttpStatus.OK)
  renderPreview(@Body() body: CampaignInput) {
    return this.campaigns.renderPreview(body ?? {});
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('test-send')
  @HttpCode(HttpStatus.OK)
  testSend(@Request() req: any, @Body() body: CampaignInput) {
    return this.campaigns.sendTest(body ?? {}, req.user.id);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('campaigns')
  create(@Request() req: any, @Body() body: CampaignInput) {
    return this.campaigns.createCampaign(body ?? {}, req.user.id);
  }

  @Get('campaigns')
  list() {
    return this.campaigns.listCampaigns();
  }

  @Get('campaigns/:id')
  get(@Param('id') id: string, @Query('status') status?: string) {
    return this.campaigns.getCampaign(id, status);
  }

  @Get('campaigns/:id/metrics')
  metrics(@Param('id') id: string) {
    return this.campaigns.getMetrics(id);
  }

  @Post('campaigns/:id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Param('id') id: string) {
    return this.campaigns.cancel(id);
  }

  @Post('campaigns/:id/retry-failed')
  @HttpCode(HttpStatus.OK)
  retryFailed(@Param('id') id: string) {
    return this.campaigns.retryFailed(id);
  }

  @Get('templates')
  listTemplates() {
    return this.templates.list();
  }

  @Post('templates')
  createTemplate(@Request() req: any, @Body() body: TemplateInput) {
    return this.templates.create(body ?? {}, req.user.id);
  }

  @Patch('templates/:id')
  updateTemplate(@Param('id') id: string, @Body() body: TemplateInput) {
    return this.templates.update(id, body ?? {});
  }

  @Delete('templates/:id')
  removeTemplate(@Param('id') id: string) {
    return this.templates.remove(id);
  }
}
