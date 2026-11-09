import { Module } from '@nestjs/common';
import { ApiTokensModule } from '../api-tokens/api-tokens.module';
import { PrismaService } from '../prisma/prisma.service';
import { QuestionPapersService } from '../question-papers/question-papers.service';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';

@Module({
  imports: [ApiTokensModule],
  controllers: [McpController],
  providers: [McpService, QuestionPapersService, PrismaService],
})
export class McpModule {}
