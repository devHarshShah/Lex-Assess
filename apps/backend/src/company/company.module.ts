import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyCandidatesController } from './company-candidates.controller';
import { CompanyCandidatesService } from './company-candidates.service';

@Module({
  controllers: [CompanyCandidatesController],
  providers: [CompanyCandidatesService, PrismaService],
})
export class CompanyModule {}
