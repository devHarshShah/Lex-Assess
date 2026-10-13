import { Controller, Get, Header, Param, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/roles';
import { AnalyticsService } from './analytics.service';
import { AnalyticsExportService } from './analytics-export.service';
import { EmailAnalyticsService } from './email-analytics.service';
import { GrowthAnalyticsService } from './growth-analytics.service';
import { OutreachAnalyticsService } from './outreach-analytics.service';

interface UsersQuery {
  stage?: string;
  crmStatus?: string;
  role?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: string;
}

@Controller('superadmin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPERADMIN)
export class SuperadminAnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly exporter: AnalyticsExportService,
    private readonly outreach: OutreachAnalyticsService,
    private readonly email: EmailAnalyticsService,
    private readonly growth: GrowthAnalyticsService,
  ) {}

  @Get('email/overview')
  emailOverview(@Query() q: UsersQuery) {
    return this.email.overview({ from: q.from, to: q.to });
  }

  @Get('email/campaigns')
  emailCampaigns(@Query() q: UsersQuery) {
    return this.email.campaigns({ from: q.from, to: q.to });
  }

  @Get('email/templates')
  emailTemplates(@Query() q: UsersQuery) {
    return this.email.templates({ from: q.from, to: q.to });
  }

  @Get('email/send-times')
  emailSendTimes(@Query() q: UsersQuery) {
    return this.email.sendTimes({ from: q.from, to: q.to });
  }

  @Get('email/subjects')
  emailSubjects(@Query() q: UsersQuery) {
    return this.email.subjects({ from: q.from, to: q.to });
  }

  @Get('email/fatigue')
  emailFatigue() {
    return this.email.fatigue();
  }

  @Get('email/campaigns/:id')
  emailCampaignDetail(@Param('id') id: string) {
    return this.email.campaignDetail(id);
  }

  @Get('revenue')
  revenue() {
    return this.growth.revenue();
  }

  @Get('funnel-timing')
  funnelTiming(@Query('weeks') weeks?: string) {
    return this.growth.funnelTiming(Math.min(Math.max(Number(weeks) || 8, 2), 26));
  }

  @Get('coupons')
  coupons(@Query() q: UsersQuery) {
    return this.email.coupons({ from: q.from, to: q.to });
  }

  @Get('crm')
  crm(@Query() q: UsersQuery) {
    return this.outreach.crm({ from: q.from, to: q.to });
  }

  @Get('company-interviews')
  companyInterviews(@Query() q: UsersQuery) {
    return this.outreach.companyInterviews({ from: q.from, to: q.to });
  }

  @Get('overview')
  overview(@Query() q: UsersQuery) {
    return this.analytics.overview({ from: q.from, to: q.to });
  }

  @Get('users')
  users(@Query() q: UsersQuery) {
    return this.analytics.listUsers(q, Number(q.page) || 1);
  }

  @Get('users.xlsx')
  @Header('Cache-Control', 'no-store')
  async exportUsers(@Query() q: UsersQuery, @Res() res: Response) {
    const buffer = await this.exporter.buildWorkbook(q);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="lexassess-user-report.xlsx"');
    res.send(buffer);
  }
}
