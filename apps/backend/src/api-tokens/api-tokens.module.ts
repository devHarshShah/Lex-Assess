import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiTokensController } from './api-tokens.controller';
import { ApiTokensService } from './api-tokens.service';

@Module({
  controllers: [ApiTokensController],
  providers: [ApiTokensService, PrismaService],
  exports: [ApiTokensService],
})
export class ApiTokensModule {}
