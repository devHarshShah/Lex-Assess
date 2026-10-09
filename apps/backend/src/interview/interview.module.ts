import { Module } from '@nestjs/common';
import { InterviewService } from './interview.service';
import { InterviewController } from './interview.controller';
import { PrismaService } from '../prisma/prisma.service';
import { CrmModule } from '../crm/crm.module';
import { CompanyInterviewAdminService } from './company-interview-admin.service';
import { SuperadminCompanyInterviewsController } from './superadmin-company-interviews.controller';

@Module({
  imports: [CrmModule],
  providers: [InterviewService, CompanyInterviewAdminService, PrismaService],
  controllers: [InterviewController, SuperadminCompanyInterviewsController],
  exports: [InterviewService],
})
export class InterviewModule {}
