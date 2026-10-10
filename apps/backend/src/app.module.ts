import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { CompanyModule } from './company/company.module';
import { QuestionPapersModule } from './question-papers/question-papers.module';
import { PaymentsModule } from './payments/payments.module';
import { InterviewModule } from './interview/interview.module';
import { RankingModule } from './ranking/ranking.module';
import { CertificatesModule } from './certificates/certificates.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { EmailCampaignsModule } from './email-campaigns/email-campaigns.module';
import { CrmModule } from './crm/crm.module';
import { SettingsModule } from './settings/settings.module';
import { MaintenanceGuard } from './settings/maintenance.guard';
import { ClientThrottlerGuard, PER_EMAIL_THROTTLER } from './common/guards/client-throttler.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
      PER_EMAIL_THROTTLER,
    ]),
    AuthModule,
    MailModule,
    CompanyModule,
    QuestionPapersModule,
    PaymentsModule,
    InterviewModule,
    RankingModule,
    CertificatesModule,
    AnalyticsModule,
    EmailCampaignsModule,
    CrmModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    // Maintenance runs first so blocked requests don't use up anyone's rate limit
    {
      provide: APP_GUARD,
      useClass: MaintenanceGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ClientThrottlerGuard,
    },
  ],
})
export class AppModule {}
