import { Module } from '@nestjs/common';
import { QuestionPapersController } from './question-papers.controller';
import { StudentQuestionPapersController } from './student-question-papers.controller';
import { SubmissionsController } from './submissions.controller';
import { QuestionPapersService } from './question-papers.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [QuestionPapersController, StudentQuestionPapersController, SubmissionsController],
  providers: [QuestionPapersService, PrismaService]
})
export class QuestionPapersModule {}
