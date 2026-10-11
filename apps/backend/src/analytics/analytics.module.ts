import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from './analytics.service';
import { AnalyticsExportService } from './analytics-export.service';
import { EmailAnalyticsService } from './email-analytics.service';
import { OutreachAnalyticsService } from './outreach-analytics.service';
import { SuperadminAnalyticsController } from './superadmin-analytics.controller';

@Module({
  providers: [AnalyticsService, AnalyticsExportService, OutreachAnalyticsService, EmailAnalyticsService, PrismaService],
  controllers: [SuperadminAnalyticsController],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
