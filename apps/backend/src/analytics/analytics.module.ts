import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from './analytics.service';
import { AnalyticsExportService } from './analytics-export.service';
import { SuperadminAnalyticsController } from './superadmin-analytics.controller';

@Module({
  providers: [AnalyticsService, AnalyticsExportService, PrismaService],
  controllers: [SuperadminAnalyticsController],
})
export class AnalyticsModule {}
