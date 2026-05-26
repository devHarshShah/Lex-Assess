import { Module } from '@nestjs/common';
import { QuestionPapersController } from './question-papers.controller';
import { StudentQuestionPapersController } from './student-question-papers.controller';
import { QuestionPapersService } from './question-papers.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [QuestionPapersController, StudentQuestionPapersController],
  providers: [QuestionPapersService, PrismaService]
})
export class QuestionPapersModule {}
