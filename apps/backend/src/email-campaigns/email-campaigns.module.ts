import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InterviewModule } from '../interview/interview.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { PrismaService } from '../prisma/prisma.service';
import { ClickController } from './click.controller';
import { EmailCampaignsService } from './email-campaigns.service';
import { EmailTemplatesService } from './email-templates.service';
import { EmailWorkerController } from './email-worker.controller';
import { SuperadminEmailController } from './superadmin-email.controller';
import { UnsubscribeController } from './unsubscribe.controller';

@Module({
  imports: [ConfigModule, AnalyticsModule, InterviewModule],
  providers: [EmailCampaignsService, EmailTemplatesService, PrismaService],
  controllers: [SuperadminEmailController, EmailWorkerController, UnsubscribeController, ClickController],
})
export class EmailCampaignsModule {}
