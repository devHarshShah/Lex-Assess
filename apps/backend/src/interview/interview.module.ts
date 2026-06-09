import { Module } from '@nestjs/common';
import { InterviewService } from './interview.service';
import { InterviewController } from './interview.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [InterviewService, PrismaService],
  controllers: [InterviewController],
  exports: [InterviewService],
})
export class InterviewModule {}
