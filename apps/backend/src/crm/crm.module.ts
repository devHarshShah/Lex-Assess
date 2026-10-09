import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { StorageModule } from '../common/storage.module';
import { PrismaService } from '../prisma/prisma.service';
import { CrmService } from './crm.service';
import { SuperadminCrmController } from './superadmin-crm.controller';

@Module({
  imports: [AnalyticsModule, StorageModule],
  providers: [CrmService, PrismaService],
  controllers: [SuperadminCrmController],
  exports: [CrmService],
})
export class CrmModule {}
