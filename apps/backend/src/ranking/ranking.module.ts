import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RankingController } from './ranking.controller';
import { RankingService } from './ranking.service';

@Module({
  controllers: [RankingController],
  providers: [RankingService, PrismaService],
})
export class RankingModule {}
